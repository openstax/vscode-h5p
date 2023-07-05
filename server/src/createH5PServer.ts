import * as os from 'os';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';

import { Cache, caching } from 'cache-manager';

import * as H5P from '@lumieducation/h5p-server';

import { download, extractArchive, fsRemove } from './utils';
import Config from './models/config';
import OSH5PEditor from './models/OpenStax/H5PEditor';
import OSStorage from './models/OpenStax/FileContentStorage';
import OSH5PServer from './models/OpenStax/H5PServer';

export async function prepareEnvironment(globalConfig: Config) {
  console.log('Preparing environment');
  const tempFolderPath = os.tmpdir() + '/h5p_server';
  const lastUpdatedFile = `${tempFolderPath}/lastUpdatedDate.json`;
  const environmentReady = await new Promise<boolean>((resolve, reject) => {
    fs.stat(lastUpdatedFile, function (err: any) {
      console.log('Checking last updated date');
      if (
        !err &&
        (new Date().getTime() -
          new Date(
            fsExtra.readJSONSync(lastUpdatedFile).lastUpdatedDate
          ).getTime()) /
          (1000 * 60 * 60 * 24) <
          4
      ) {
        console.log('Environment is ready');
        resolve(true);
      } else {
        console.log('LastUpdateDate is not available');
        resolve(false);
      }
    });
  });
  if (!environmentReady) {
    console.log('Environment is not ready');
    await fsRemove(tempFolderPath);

    if (!fsExtra.existsSync(tempFolderPath)) {
      fs.mkdirSync(`${tempFolderPath}`, { recursive: true });
    }

    const version = `1.24.4`;
    const coreFile = `${tempFolderPath}/core_${version}.zip`;
    const editorFile = `${tempFolderPath}/editor_${version}.zip`;

    try {
      fs.mkdirSync(globalConfig.contentDirectory, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/libraries`, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/temporary-storage`, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/core`, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/editor`, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/user-data`, { recursive: true });
      fs.mkdirSync(`${tempFolderPath}/tmp`, { recursive: true });
    } catch (err) {
      console.log('Failed to create the folders');
      console.error(`${err}`);
    }
    await download(
      `https://github.com/h5p/h5p-php-library/archive/${version}.zip`,
      coreFile
    );
    await extractArchive(coreFile, `${tempFolderPath}/core`, true);
    await download(
      `https://github.com/h5p/h5p-editor-php-library/archive/${version}.zip`,
      editorFile
    );

    await extractArchive(editorFile, `${tempFolderPath}/editor`, true);

    const config = JSON.stringify({
      disableFullscreen: false,
      fetchingDisabled: 0,
      uuid: '8de62c47-f335-42f6-909d-2d8f4b7fb7f5',
      siteType: 'local',
      sendUsageStatistics: false,
      contentHubEnabled: true,
      hubRegistrationEndpoint: 'https://api.h5p.org/v1/sites',
      hubContentTypesEndpoint: 'https://api.h5p.org/v1/content-types/',
      contentUserDataUrl: '/contentUserData',
      contentTypeCacheRefreshInterval: 86400000,
      enableLrsContentTypes: true,
      maxFileSize: 1048576000,
      maxTotalSize: 1048576000,
      contentUserStateSaveInterval: 5000,
      editorAddons: {
        'H5P.CoursePresentation': ['H5P.MathDisplay'],
        'H5P.InteractiveVideo': ['H5P.MathDisplay'],
        'H5P.DragQuestion': ['H5P.MathDisplay'],
      },
    });
    const lastUpdated = JSON.stringify({
      lastUpdatedDate: new Date(),
    });

    fs.writeFileSync(`${tempFolderPath}/config.json`, config);
    fs.writeFileSync(lastUpdatedFile, lastUpdated);
  }
}

function buildServerURL(port: number): string {
  if (process.env['GITPOD_WORKSPACE_ID']) {
    return `https://${port}-${process.env['GITPOD_WORKSPACE_ID']}.${process.env['GITPOD_WORKSPACE_CLUSTER_HOST']}`;
  } else {
    return `http://localhost:${port}`;
  }
}

async function createH5PEditor(
  config: H5P.IH5PConfig,
  localLibraryPath: string,
  extensionConfig: Config,
  localTemporaryPath: string,
  localUserContentPath: string,
  urlGenerator?: H5P.IUrlGenerator,
  translationCallback?: H5P.ITranslationFunction,
  hooks?: {
    contentWasDeleted?: (contentId: string, user: H5P.IUser) => Promise<void>;
    contentWasUpdated?: (
      contentId: string,
      metadata: H5P.IContentMetadata,
      parameters: any,
      user: H5P.IUser
    ) => Promise<void>;
    contentWasCreated?: (
      contentId: string,
      metadata: H5P.IContentMetadata,
      parameters: any,
      user: H5P.IUser
    ) => Promise<void>;
  }
): Promise<OSH5PEditor> {
  console.debug(`Using in memory cache for caching library storage.`);
  const cache: Cache = caching({
    store: 'memory',
    ttl: 60 * 60 * 24,
    max: 2 ** 10,
  });

  console.debug(`Using simple in-memory lock provider.`);
  const lock: H5P.ILockProvider = new H5P.SimpleLockProvider();

  // Depending on the environment variables we use different implementations
  // of the storage interfaces.

  const libraryStorage: H5P.ILibraryStorage =
    new H5P.fsImplementations.FileLibraryStorage(localLibraryPath);

  const userStorage: H5P.IContentUserDataStorage =
    new H5P.fsImplementations.FileContentUserDataStorage(localUserContentPath);

  const h5pEditor = new OSH5PEditor(
    new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
    config,
    new H5P.cacheImplementations.CachedLibraryStorage(libraryStorage, cache),
    new OSStorage(extensionConfig),
    new H5P.fsImplementations.DirectoryTemporaryFileStorage(localTemporaryPath),
    translationCallback,
    urlGenerator,
    {
      enableHubLocalization: true,
      enableLibraryNameLocalization: true,
      lockProvider: lock,
      hooks: hooks,
    },
    userStorage
  );

  return h5pEditor;
}

export async function startH5P(globalConfig: Config) {
  const tempFolderPath = os.tmpdir() + '/h5p_server';
  console.log(`Express Server serving: ${tempFolderPath}`);
  const server_url = buildServerURL(globalConfig.port);
  // Load the configuration file from the local file system
  fs.readFile(`${tempFolderPath}/config.json`, (err, data) => {
    if (err) throw err;
  });
  const config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(`${tempFolderPath}/config.json`)
  ).load();
  const urlGenerator = new H5P.UrlGenerator(config, {
    queryParamGenerator: (user) => {
      return {
        name: '',
        value: '',
      };
    },
    protectAjax: false,
    protectContentUserData: false,
    protectSetFinished: false,
  });
  urlGenerator.baseUrl = () => `${server_url}/h5p`;
  // The H5PEditor object is central to all operations of h5p-nodejs-library
  // if you want to user the editor component.
  //
  // To create the H5PEditor object, we call a helper function, which
  // uses implementations of the storage classes with a local filesystem
  // or a MongoDB/S3 backend, depending on the configuration values set
  // in the environment variables.
  // In your implementation, you will probably instantiate H5PEditor by
  // calling new H5P.H5PEditor(...) or by using the convenience function
  // H5P.fs(...).
  const h5pEditor: OSH5PEditor = await createH5PEditor(
    config,
    `${tempFolderPath}/libraries`, // the path on the local disc where libraries should be stored)

    globalConfig, // the path on the local disc where content
    // is stored. Only used / necessary if you use the local filesystem
    // content storage class.

    `${tempFolderPath}/temporary-storage`, // the path on the local disc
    // where temporary files (uploads) should be stored. Only used /
    // necessary if you use the local filesystem temporary storage class.
    `${tempFolderPath}/user-data`, // the path on the local disc where user data should be stored
    urlGenerator,
    undefined,
    undefined
  );

  h5pEditor.setRenderer((model) => model);
  // The H5PPlayer object is used to display H5P content.
  const h5pPlayer = new H5P.H5PPlayer(
    h5pEditor.libraryStorage,
    h5pEditor.contentStorage,
    config,
    undefined,
    urlGenerator,
    undefined,
    {
      getPermissions: async (contentId, user) => {
        return [
          H5P.Permission.Delete,
          H5P.Permission.Download,
          H5P.Permission.Edit,
          H5P.Permission.Embed,
          H5P.Permission.List,
          H5P.Permission.View,
        ];
      },
    }
  );

  h5pPlayer.setRenderer((model) => model);

  // We now set up the Express server in the usual fashion.

  process.env['DEBUG'] = '*';

  const server = new OSH5PServer(h5pEditor, h5pPlayer, tempFolderPath);
  await server.start(globalConfig.port);
}
