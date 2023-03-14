import os from 'os';
import fs from 'fs';
import fetch from 'node-fetch';
import fsExtra from 'fs-extra';
import unzip from 'unzip-stream';
import express from 'express';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import path from 'path';

import { Cache, caching } from 'cache-manager';

import * as H5P from '@lumieducation/h5p-server';

import {
  h5pAjaxExpressRouter,
  libraryAdministrationExpressRouter,
  contentTypeCacheExpressRouter,
  IRequestWithUser,
} from '@lumieducation/h5p-express';

async function prepareEnvironment() {
  let tempFolderPath = os.tmpdir() + '/h5p_server';
  await fsRemove(tempFolderPath);
  fs.access(tempFolderPath, function (err: any) {
    if (err && err.code === 'ENOENT') {
      fs.mkdirSync(tempFolderPath, { recursive: true });
    }
  });
  let version = `1.24.4`;
  let coreFile = `${tempFolderPath}/core_${version}.zip`;
  let editorFile = `${tempFolderPath}/editor_${version}.zip`;

  let saveMetadataJsonSchema = `${tempFolderPath}/tmp/save-metadata.json`
  let libraryJsonSchema = `${tempFolderPath}/tmp/library-schema.json`

  fs.mkdirSync(`${tempFolderPath}/content`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/libraries`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/temporary-storage`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/core`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/editor`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/user-data`, { recursive: true });
  fs.mkdirSync(`${tempFolderPath}/tmp`, { recursive: true });

  await downloadAndExtract(
    `https://github.com/h5p/h5p-php-library/archive/${version}.zip`,
    coreFile
  );
  await downloadAndExtract(
    `https://github.com/h5p/h5p-editor-php-library/archive/${version}.zip`,
    editorFile
  );
  await downloadAndExtract(
    `https://raw.githubusercontent.com/Lumieducation/H5P-Nodejs-library/master/packages/h5p-server/src/schemas/save-metadata.json`,
    saveMetadataJsonSchema
  );
  await downloadAndExtract(
    `https://raw.githubusercontent.com/Lumieducation/H5P-Nodejs-library/master/packages/h5p-server/src/schemas/library-schema.json`,
    libraryJsonSchema
  );

  await extractArchive(coreFile, `${tempFolderPath}/core`, true);
  await extractArchive(editorFile, `${tempFolderPath}/editor`, true);

  let config = JSON.stringify({
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
  await fs.writeFileSync(`${tempFolderPath}/config.json`, config);

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
  fsExtra
    .createReadStream(path)
    .pipe(unzip.Parse())
    .on('entry', function (entry: any) {
      var rootDir = entry.path.split('/')[0];
      var filePath = `${destinationFolder}/${entry.path.replace(
        rootDir + '/',
        ''
      )}`;

      if (entry.type === 'Directory' && entry.path !== rootDir) {
        fs.mkdirSync(filePath, { recursive: true });
      } else entry.pipe(fs.createWriteStream(filePath));
    })
    .on('close', function () {
      console.log(`Extracted file ${path}`);
      if (deleteArchive) fsRemove(path);
    });
}

async function downloadAndExtract(
  url: string,
  destinationPath: string
): Promise<void> {
  console.debug(`Downloading ${url} to ${destinationPath}`);
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(destinationPath);
  return await new Promise<void>((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', () => {
      console.log(`Downloaded ${url} to ${destinationPath}`);
      resolve();
    });
  });
}

/**
 * Displays links to the server at all available IP addresses.
 * @param port The port at which the server can be accessed.
 */
function displayIps(port: string): void {
  console.log('H5P Server Started!');
  const networkInterfaces = os.networkInterfaces();

  // eslint-disable-next-line guard-for-in
  for (const devName in networkInterfaces) {
    networkInterfaces[devName]
      .filter((int: { internal: any }) => !int.internal)
      .forEach((int: { family: string; address: any }) =>
        console.log(
          `http://${int.family === 'IPv6' ? '[' : ''}${int.address}${
            int.family === 'IPv6' ? ']' : ''
          }:${port}`
        )
      );
  }
}

async function createH5PEditor(
  config: H5P.IH5PConfig,
  localLibraryPath: string,
  localContentPath?: string,
  localTemporaryPath?: string,
  translationCallback?: H5P.ITranslationFunction
): Promise<H5P.H5PEditor> {
  let cache: Cache;
  console.debug(`Using in memory cache for caching library storage.`);
  cache = caching({
    store: 'memory',
    ttl: 60 * 60 * 24,
    max: 2 ** 10,
  });

  let lock: H5P.ILockProvider;
  console.debug(`Using simple in-memory lock provider.`);
  lock = new H5P.SimpleLockProvider();

  // Depending on the environment variables we use different implementations
  // of the storage interfaces.

  let libraryStorage: H5P.ILibraryStorage;

  libraryStorage = new H5P.fsImplementations.FileLibraryStorage(
    localLibraryPath
  );

  const h5pEditor = new H5P.H5PEditor(
    new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
    config,
    new H5P.cacheImplementations.CachedLibraryStorage(libraryStorage, cache),
    new H5P.fsImplementations.FileContentStorage(localContentPath),
    new H5P.fsImplementations.DirectoryTemporaryFileStorage(localTemporaryPath),
    translationCallback,
    undefined,
    {
      enableHubLocalization: true,
      enableLibraryNameLocalization: true,
      lockProvider: lock,
    }
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

  router.get(
    `${h5pEditor.config.playUrl}/:contentId`,
    async (req: IRequestWithUser, res) => {
      try {
        const h5pPage = await h5pPlayer.render(
          req.params.contentId,
          req.user,
          'en',
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
      } catch (error) {
        res.status(500).end(error.message);
      }
    }
  );

  router.get(
    '/edit/:contentId',
    async (req: IRequestWithLanguage & IRequestWithUser, res) => {
      const page = await h5pEditor.render(
        req.params.contentId,
        languageOverride === 'auto' ? req.language ?? 'en' : languageOverride,
        req.user
      );
      res.send(page);
      res.status(200).end();
    }
  );

  router.post('/edit/:contentId', async (req: IRequestWithUser, res) => {
    const contentId = await h5pEditor.saveOrUpdateContent(
      req.params.contentId.toString(),
      req.body.params.params,
      req.body.params.metadata,
      req.body.library,
      req.user
    );

    res.send(JSON.stringify({ contentId }));
    res.status(200).end();
  });

  router.get(
    '/new',
    async (req: IRequestWithLanguage & IRequestWithUser, res) => {
      const page = await h5pEditor.render(
        undefined,
        languageOverride === 'auto' ? req.language ?? 'en' : languageOverride,
        req.user
      );
      res.send(page);
      res.status(200).end();
    }
  );

  router.post('/new', async (req: IRequestWithUser, res) => {
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
    const contentId = await h5pEditor.saveOrUpdateContent(
      undefined,
      req.body.params.params,
      req.body.params.metadata,
      req.body.library,
      req.user
    );

    res.send(JSON.stringify({ contentId }));
    res.status(200).end();
  });

  router.get('/delete/:contentId', async (req: IRequestWithUser, res) => {
    try {
      await h5pEditor.deleteContent(req.params.contentId, req.user);
    } catch (error) {
      res.send(
        `Error deleting content with id ${req.params.contentId}: ${error.message}<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
      );
      res.status(500).end();
      return;
    }

    res.send(
      `Content ${req.params.contentId} successfully deleted.<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
    );
    res.status(200).end();
  });

  return router;
}

function renderPage(editor: H5P.H5PEditor): (req: any, res: any) => any {
  return async (req, res) => {
    const contentIds = await editor.contentManager.listContent();
    const contentObjects = await Promise.all(
      contentIds.map(async (id) => ({
        content: await editor.contentManager.getContentMetadata(id, req.user),
        id,
      }))
    );
    res.send(`
      <!doctype html>
      <html>
      <head>
          <meta charset="utf-8">
          <script src="/node_modules/requirejs/require.js"></script>
          <link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css">
          <link rel="stylesheet" href="/node_modules/@fortawesome/fontawesome-free/css/all.min.css">
          <title>H5P NodeJs Demo</title>
      </head>
      <body>
          <div class="container">
              <h1>H5P NodeJs Demo</h1>
              <div class="alert alert-warning">This demo is for debugging and demonstration purposes only and not suitable for production use!</div>
              <h2>
                  <span class="fa fa-file"></span> Existing content
              </h2>
              <a class="btn btn-primary my-2" href="${
                editor.config.baseUrl
              }/new"><span class="fa fa-plus-circle m-2"></span>Create new content</a>
              <div class="list-group">
              ${contentObjects
                .map(
                  (content) =>
                    `<div class="list-group-item">
                              <div class="d-flex w-10">
                                  <div class="me-auto p-2 align-self-center">
                                      <a href="${editor.config.baseUrl}${editor.config.playUrl}/${content.id}">
                                          <h5>${content.content.title}</h5>
                                      </a>
                                      <div class="small d-flex">
                                          <div class="me-2">
                                              <span class="fa fa-book-open"></span>
                                              ${content.content.mainLibrary}
                                          </div>
                                          <div class="me-2">
                                              <span class="fa fa-fingerprint"></span>
                                              ${content.id}
                                          </div>
                                      </div>
                                  </div>
                                  <div class="p-2">
                                      <a class="btn btn-secondary" href="${editor.config.baseUrl}/edit/${content.id}">
                                          <span class="fa fa-pencil-alt m-1"></span>
                                          edit
                                      </a>
                                  </div>
                                  <div class="p-2">
                                      <a class="btn btn-info" href="${editor.config.baseUrl}${editor.config.downloadUrl}/${content.id}">
                                          <span class="fa fa-file-download m-1"></span>
                                          download
                                      </a>
                                  </div>
                                  <div class="p-2">
                                      <a class="btn btn-info" href="${editor.config.baseUrl}/html/${content.id}">
                                          <span class="fa fa-file-download m-1"></span>
                                          download HTML
                                      </a>
                                  </div>
                                  <div class="p-2">
                                      <a class="btn btn-danger" href="${editor.config.baseUrl}/delete/${content.id}">
                                          <span class="fa fa-trash-alt m-1"></span>
                                          delete
                                      </a>
                                  </div>
                              </div>
                          </div>`
                )
                .join('')}
              </div>
              <hr/>
              <div id="content-type-cache-container"></div>
              <hr/>
              <div id="library-admin-container"></div>
          </div>

          <script>
              requirejs.config({
                  baseUrl: "assets/js",
                  paths: {
                      react: '/node_modules/react/umd/react.development',
                      "react-dom": '/node_modules/react-dom/umd/react-dom.development'
                  }
              });
              requirejs([
                  "react",
                  "react-dom",
                  "./client/LibraryAdminComponent.js",
                  "./client/ContentTypeCacheComponent.js"],
                  function (React, ReactDOM, LibraryAdmin, ContentTypeCache) {
                      const libraryAdminContainer = document.querySelector('#library-admin-container');
                      ReactDOM.render(React.createElement(LibraryAdmin.default, { endpointUrl: 'h5p/libraries' }), libraryAdminContainer);
                      const contentTypeCacheContainer = document.querySelector('#content-type-cache-container');
                      ReactDOM.render(React.createElement(ContentTypeCache.default, { endpointUrl: 'h5p/content-type-cache' }), contentTypeCacheContainer);
                  });
          </script>
      </body>
      `);
  };
}
async function startH5P() {
  let tempFolderPath = os.tmpdir() + '/h5p_server';
  // Load the configuration file from the local file system
  fs.readFile(`${tempFolderPath}/config.json`, (err, data) => {
    if (err) throw err;
    console.log(data);
  });
  let config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(`${tempFolderPath}/config.json`)
  );
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
    // necessary if you use the local filesystem temporary storage class.,

    undefined
  );
  // The H5PPlayer object is used to display H5P content.
  const h5pPlayer = new H5P.H5PPlayer(
    h5pEditor.libraryStorage,
    h5pEditor.contentStorage,
    config,
    undefined,
    undefined,
    undefined,
    undefined
  );

  // We now set up the Express server in the usual fashion.
  const server = express();

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
  server.use((req: IRequestWithUser, res, next) => {
    req.user = new User();
    next();
  });

  // The Express adapter handles GET and POST requests to various H5P
  // endpoints. You can add an options object as a last parameter to configure
  // which endpoints you want to use. In this case we don't pass an options
  // object, which means we get all of them.
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

  // The startPageRenderer displays a list of content objects and shows
  // buttons to display, edit, delete and download existing content.
  server.get('/', renderPage(h5pEditor));

  const port = process.env.PORT || '8080';

  // For developer convenience we display a list of IPs, the server is running
  // on. You can then simply click on it in the terminal.
  displayIps(port);

  server.listen(port);
}
export async function startServer() {
  await prepareEnvironment();
  await startH5P();
}
