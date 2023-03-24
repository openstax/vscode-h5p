import * as os from 'os';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import fetch from 'node-fetch';

import cors from 'cors';

import express from 'express';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';

import { Cache, caching } from 'cache-manager';

import * as H5P from '@lumieducation/h5p-server';

import {
  h5pAjaxExpressRouter,
  libraryAdministrationExpressRouter,
  contentTypeCacheExpressRouter,
  IRequestWithUser,
  IRequestWithLanguage,
} from '@lumieducation/h5p-express';
import decompress from 'decompress';
import { getIps } from './utils';

export async function prepareEnvironment() {
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
    fs.access(tempFolderPath, function (err: any) {
      if (err && err.code === 'ENOENT') {
        fs.mkdirSync(`${tempFolderPath}`, { recursive: true });
      }
    });

    const version = `1.24.4`;
    const coreFile = `${tempFolderPath}/core_${version}.zip`;
    const editorFile = `${tempFolderPath}/editor_${version}.zip`;

    try {
      fs.mkdirSync(`${tempFolderPath}/content`, { recursive: true });
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

async function fsRemove(folderPath: string) {
  fs.rmSync(folderPath, { recursive: true, force: true });
}

async function extractArchive(
  path: string,
  destinationFolder: string,
  deleteArchive: boolean
): Promise<void> {
  console.log(`Extracting file ${path}`);
  return await decompress(path, destinationFolder, { strip: 1 })
    .then((files) => {
      console.log('Files extracted');
      if (deleteArchive) fsRemove(path);
    })
    .catch((error) => {
      console.error(error);
    });
}

async function download(url: string, destinationPath: string): Promise<void> {
  console.debug(`Downloading ${url} to ${destinationPath}`);

  const fileStream = fs.createWriteStream(destinationPath);
  const res = await fetch(url);
  await new Promise((resolve, reject) => {
    res.body!.pipe(fileStream);
    res.body!.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

/**
 * Displays links to the server at all available IP addresses.
 * @param port The port at which the server can be accessed.
 */
function displayIps(port: string): void {
  console.log('H5P Server Started!');
  getIps().forEach((address) =>
    console.log(`Server address....  http://${address}:${port}`)
  );
}

async function createH5PEditor(
  config: H5P.IH5PConfig,
  localLibraryPath: string,
  localContentPath: string,
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
): Promise<H5P.H5PEditor> {
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

  const h5pEditor = new H5P.H5PEditor(
    new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
    config,
    new H5P.cacheImplementations.CachedLibraryStorage(libraryStorage, cache),
    new H5P.fsImplementations.FileContentStorage(localContentPath),
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

class User implements H5P.IUser {
  constructor() {
    this.id = '1';
    this.name = 'Mock User';
    this.canInstallRecommended = true;
    this.canUpdateAndInstallLibraries = true;
    this.canCreateRestricted = true;
    this.type = 'local';
    this.email = 'test@openstax.com';
  }

  public canCreateRestricted: boolean;
  public canInstallRecommended: boolean;
  public canUpdateAndInstallLibraries: boolean;
  public email: string;
  public id: string;
  public name: string;
  public type: 'local';
}

/**
 * @param h5pEditor
 * @param h5pPlayer
 * @param languageOverride the language to use. Set it to 'auto' to use the
 * language set by a language detector in the req.language property.
 * (recommended)
 */
function serverRoute(
  h5pEditor: H5P.H5PEditor,
  h5pPlayer: H5P.H5PPlayer,
  languageOverride: string | 'auto' = 'auto'
): express.Router {
  const router = express.Router();

  router.get(`/:contentId/play`, async (req: any, res: any) => {
    try {
      const h5pPage = await h5pPlayer.render(
        req.params.contentId,
        req.user,
        languageOverride === 'auto' ? req.language ?? 'en' : languageOverride,
        {
          showCopyButton: true,
          showDownloadButton: true,
          showFrame: true,
          showH5PIcon: true,
          showLicenseButton: true,
        }
      );
      res.send(h5pPage);
      res.status(200).end();
    } catch (error: any) {
      res.status(500).end(error.message);
    }
  });

  router.get(
    '/:contentId/edit',
    async (req: IRequestWithLanguage & IRequestWithUser, res: any) => {
      // This route merges the render and the /ajax/params routes to avoid a
      // second request.
      const editorModel = (await h5pEditor.render(
        req.params.contentId,
        languageOverride === 'auto' ? req.language ?? 'en' : languageOverride,
        req.user
      )) as H5P.IEditorModel;
      if (!req.params.contentId || req.params.contentId === 'undefined') {
        res.send(editorModel);
      } else {
        const content = await h5pEditor.getContent(req.params.contentId);
        res.send({
          ...editorModel,
          library: content.library,
          metadata: content.params.metadata,
          params: content.params.params,
        });
      }
      res.status(200).end();
    }
  );

  router.post('/', async (req: IRequestWithUser, res: any) => {
    if (
      !req.body.params ||
      !req.body.params.params ||
      !req.body.params.metadata ||
      !req.body.library ||
      !req.user
    ) {
      res.status(400).send('Malformed request').end();
      return;
    }
    const { id: contentId, metadata } =
      await h5pEditor.saveOrUpdateContentReturnMetaData(
        undefined!,
        req.body.params.params,
        req.body.params.metadata,
        req.body.library,
        req.user
      );

    res.send(JSON.stringify({ contentId, metadata }));
    res.status(200).end();
  });

  router.patch('/:contentId', async (req: IRequestWithUser, res: any) => {
    if (
      !req.body.params ||
      !req.body.params.params ||
      !req.body.params.metadata ||
      !req.body.library ||
      !req.user
    ) {
      res.status(400).send('Malformed request').end();
      return;
    }
    const { id: contentId, metadata } =
      await h5pEditor.saveOrUpdateContentReturnMetaData(
        req.params.contentId.toString(),
        req.body.params.params,
        req.body.params.metadata,
        req.body.library,
        req.user
      );

    res.send(JSON.stringify({ contentId, metadata }));
    res.status(200).end();
  });

  router.delete('/:contentId', async (req: IRequestWithUser, res: any) => {
    try {
      await h5pEditor.deleteContent(req.params.contentId, req.user);
    } catch (error: any) {
      res.send(
        `Error deleting content with id ${req.params.contentId}: ${error.message}`
      );
      res.status(500).end();
      return;
    }

    res.send(`Content ${req.params.contentId} successfully deleted.`);
    res.status(200).end();
  });

  router.get('/', async (req: IRequestWithUser, res: any) => {
    // TODO: check access permissions

    const contentIds = await h5pEditor.contentManager.listContent();
    const contentObjects = await Promise.all(
      contentIds.map(async (id) => ({
        content: await h5pEditor.contentManager.getContentMetadata(
          id,
          req.user
        ),
        id,
      }))
    );

    res.status(200).send(
      contentObjects.map((o) => ({
        contentId: o.id,
        title: o.content.title,
        mainLibrary: o.content.mainLibrary,
      }))
    );
  });

  return router;
}

export async function startH5P() {
  const port: number = Number(process.env.PORT) || 8080;
  const tempFolderPath = os.tmpdir() + '/h5p_server';
  console.log(`Express Server serving: ${tempFolderPath}`);
  // Load the configuration file from the local file system
  fs.readFile(`${tempFolderPath}/config.json`, (err, data) => {
    if (err) throw err;
  });
  const config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(`${tempFolderPath}/config.json`)
  );
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
  urlGenerator.baseUrl = () => `http://${getIps()[0]}:${port}/h5p`;
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
  const h5pEditor: H5P.H5PEditor = await createH5PEditor(
    config,
    `${tempFolderPath}/libraries`, // the path on the local disc where libraries should be stored)

    `${tempFolderPath}/content`, // the path on the local disc where content
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

  const server = express();
  server.use((err, req, res, next) => {
    next();
    if (err || res.statusCode >= 400) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    }
    console.log(req.headers);
    res.set('Access-Control-Allow-Origin', getIps());
    res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
  });
  server.use(
    cors({
      origin: '*',
      credentials: false,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    })
  );

  server.use(bodyParser.json({ limit: '500mb' }));
  server.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  // Configure file uploads
  server.use(
    fileUpload({
      limits: { fileSize: h5pEditor.config.maxTotalSize },
      useTempFiles: true,
      tempFileDir: `${tempFolderPath}/tmp`,
    })
  );

  // It is important that you inject a user object into the request object!
  // The Express adapter below (H5P.adapters.express) expects the user
  // object to be present in requests.
  // In your real implementation you would create the object using sessions,
  // JSON webtokens or some other means.
  server.use((req: IRequestWithUser, res: any, next: any) => {
    req.user = new User();
    next();
  });

  // Initialize CSRF protection. If we add it as middleware, it checks if a
  // token was passed into a state altering route. We pass this token to the
  // client in two ways:
  //   - Return it as a property of the return data on login (used for the CUD
  //     routes in the content service)
  //   - Add the token to the URLs in the H5PIntegration object as a query
  //     parameter. This is done by passing in a custom UrlGenerator that gets
  //     the csrfToken from the user object. We put the token into the user
  //     object in the addCsrfTokenToUser middleware.
  // const csrfProtection = csurf();

  // The Express adapter handles GET and POST requests to various H5P
  // endpoints. You can add an options object as a last parameter to configure
  // which endpoints you want to use. In this case we don't pass an options
  // object, which means we get all of them.
  console.log(`H5P Editor base URL: ${h5pEditor.config.baseUrl}`);
  server.use(
    h5pEditor.config.baseUrl,
    h5pAjaxExpressRouter(
      h5pEditor,
      `${tempFolderPath}/core`, // the path on the local disc where the
      // files of the JavaScript client of the player are stored
      `${tempFolderPath}/editor`, // the path on the local disc where the
      // files of the JavaScript client of the editor are stored
      undefined,
      'en' // You can change the language of the editor here by setting
      // the language code you need here. 'auto' means the route will try
      // to use the language detected by the i18next language detector.
    )
  );
  // The expressRoutes are routes that create pages for these actions:
  // - Creating new content
  // - Editing content
  // - Saving content
  // - Deleting content
  server.use(
    h5pEditor.config.baseUrl,
    serverRoute(
      h5pEditor,
      h5pPlayer,
      'en' // You can change the language of the editor by setting
      // the language code you need here. 'auto' means the route will try
      // to use the language detected by the i18next language detector.
    )
  );
  // The LibraryAdministrationExpress routes are REST endpoints that offer
  // library management functionality.
  server.use(
    `${h5pEditor.config.baseUrl}/libraries`,
    libraryAdministrationExpressRouter(h5pEditor)
  );

  // The ContentTypeCacheExpress routes are REST endpoints that allow updating
  // the content type cache manually.
  server.use(
    `${h5pEditor.config.baseUrl}/content-type-cache`,
    contentTypeCacheExpressRouter(h5pEditor.contentTypeCache)
  );

  // For developer convenience we display a list of IPs, the server is running
  // on. You can then simply click on it in the terminal.
  displayIps(port.toString());

  server.listen(port, getIps()[0], function() {
    console.log(`... port ${port} with Settings:  ${JSON.stringify(server.settings)} mode`);
  });
  await downloadLibraries(
    getIps()[0],
    port,
    '/h5p/ajax?action=content-type-cache',
    h5pEditor
  );
}

async function downloadLibraries(
  hostname: string,
  port: number,
  path: string,
  h5PEditor: H5P.H5PEditor
): Promise<any> {
  console.log(`Updating libraries`);
  const res = await fetch(`http://${hostname}:${port}${path}`).then((res) =>
    res.json()
  );
  const user = new User();
  return  Promise.all(res.libraries
  .filter((lib) => !lib.installed || !lib.isUpToDate)
    .map((lib) => lib.machineName)
    .map(async (libraryName) => {
      console.log(`Installing ${libraryName}`);
      return h5PEditor.installLibraryFromHub(libraryName, user).then((res) => {
        console.log(res);
      });
    }));
}
