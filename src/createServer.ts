
import express from 'express';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import os from 'os';

import { Cache, caching } from 'cache-manager';

import * as H5P from '@lumieducation/h5p-server';
import H5PHtmlExporter from '@lumieducation/h5p-html-exporter';

import {
  h5pAjaxExpressRouter,
  libraryAdministrationExpressRouter,
  contentTypeCacheExpressRouter,
  IRequestWithUser
} from '@lumieducation/h5p-express';








export async function startServer() {


  let tempFolderPath = os.tmpdir() + '/h5p_server';
  // Load the configuration file from the local file system
  let config = await new H5P.H5PConfig(
    new H5P.fsImplementations.JsonStorage(
        `${tempFolderPath}/config.json`
    ));

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
    `${tempFolderPath}/user-data`,
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

  const htmlExporter = new H5PHtmlExporter(
    h5pEditor.libraryStorage,
    h5pEditor.contentStorage,
    h5pEditor.config,
    `${tempFolderPath}/core`,
    `${tempFolderPath}/editor`
  );

  server.get('/h5p/html/:contentId', async (req, res) => {
    const html = await htmlExporter.createSingleBundle(
      req.params.contentId,
      (req as any).user,
      {
        language: 'en',
        showLicenseButton: true,
      }
    );
    res.setHeader(
      'Content-disposition',
      `attachment; filename=${req.params.contentId}.html`
    );
    res.status(200).send(html);
  });

  // The startPageRenderer displays a list of content objects and shows
  // buttons to display, edit, delete and download existing content.
  server.get('/', renderPage(h5pEditor));


  const port = process.env.PORT || '8080';

  // For developer convenience we display a list of IPs, the server is running
  // on. You can then simply click on it in the terminal.
  displayIps(port);

  server.listen(port);
}
