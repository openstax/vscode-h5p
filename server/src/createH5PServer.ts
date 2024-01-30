import * as os from 'os';

import { Cache, caching } from 'cache-manager';

import * as H5P from '@lumieducation/h5p-server';

import { extractArchive } from './utils';
import Config from './models/OpenStax/config';
import OSH5PEditor from './models/OpenStax/H5PEditor';
import OSStorage from './models/OpenStax/FileContentStorage';
import OSH5PServer from './models/OpenStax/H5PServer';

export function createH5PEditor(
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
      user: H5P.IUser,
    ) => Promise<void>;
    contentWasCreated?: (
      contentId: string,
      metadata: H5P.IContentMetadata,
      parameters: any,
      user: H5P.IUser,
    ) => Promise<void>;
  },
): OSH5PEditor {
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

  const temporaryFileStorage =
    new H5P.fsImplementations.DirectoryTemporaryFileStorage(localTemporaryPath);

  const h5pEditor = new OSH5PEditor(
    new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
    config,
    new H5P.cacheImplementations.CachedLibraryStorage(libraryStorage, cache),
    new OSStorage(extensionConfig, temporaryFileStorage),
    temporaryFileStorage,
    translationCallback,
    urlGenerator,
    {
      enableHubLocalization: true,
      enableLibraryNameLocalization: true,
      lockProvider: lock,
      hooks: hooks,
      permissionSystem: new H5P.LaissezFairePermissionSystem(),
    },
    userStorage,
  );

  return h5pEditor;
}

export async function startH5P(globalConfig: Config) {
  const tempFolderPath = os.tmpdir() + '/h5p_server';
  await extractArchive(
    `${__dirname}/${Config.h5pServerArchiveName}`,
    `${tempFolderPath}`,
    false,
    undefined,
    { strip: 0 },
  );
  // Load the configuration file from the local file system
  const config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(`${tempFolderPath}/config.json`),
  ).load();
  const urlGenerator = new H5P.UrlGenerator(config, {
    queryParamGenerator: () => {
      return {
        name: '',
        value: '',
      };
    },
    protectAjax: false,
    protectContentUserData: false,
    protectSetFinished: false,
  });
  urlGenerator.baseUrl = () => `${Config.serverUrl}/h5p`;
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
  const h5pEditor: OSH5PEditor = createH5PEditor(
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
    undefined,
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
      customization: {
        global: {
          scripts: [
            `${Config.serverUrl}/static/player-plugins/mathjax.js`,
            `${Config.serverUrl}/static/common-plugins/baseurl.js`,
          ],
        },
      },
    },
  );

  h5pPlayer.setRenderer((model) => model);

  // We now set up the Express server in the usual fashion.

  process.env['DEBUG'] = '*';

  const server = new OSH5PServer(h5pEditor, h5pPlayer, tempFolderPath);
  server.start(Config.port);
  console.log(`Express Server serving: ${tempFolderPath}`);
}
