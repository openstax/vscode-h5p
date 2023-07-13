import {
  h5pAjaxExpressRouter,
  libraryAdministrationExpressRouter,
  contentTypeCacheExpressRouter,
  IRequestWithUser,
  IRequestWithLanguage,
} from '@lumieducation/h5p-express';
import * as H5P from '@lumieducation/h5p-server';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';

import { createH5PRouter, getIps } from '../utils';
import User from './H5PUser';

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

export default class H5PServer<
  EditorType extends H5P.H5PEditor = H5P.H5PEditor,
  PlayerType extends H5P.H5PPlayer = H5P.H5PPlayer,
  EditRequestType extends IRequestWithUser &
    IRequestWithLanguage = IRequestWithLanguage & IRequestWithUser,
  ContentRequestType extends IRequestWithUser = IRequestWithUser
> {
  constructor(
    protected readonly h5pEditor: EditorType,
    protected readonly h5pPlayer: PlayerType,
    protected readonly tempFolderPath: string,
    protected readonly languageOverride: string | 'auto' = 'auto'
  ) {}

  public async start(port: number) {
    const server = express();
    this.configureMiddleware(server, port);
    // For developer convenience we display a list of IPs, the server is running
    // on. You can then simply click on it in the terminal.
    displayIps(port.toString());
    server.listen(port, getIps()[0], () => {
      console.log(
        `... port ${port} with Settings:  ${JSON.stringify(
          server.settings
        )} mode`
      );
    });
  }

  protected configureMiddleware(server: express.Express, port: number) {
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
        limits: { fileSize: this.h5pEditor.config.maxTotalSize },
        useTempFiles: true,
        tempFileDir: `${this.tempFolderPath}/tmp`,
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

    server.use(
      this.h5pEditor.config.baseUrl,
      h5pAjaxExpressRouter(
        this.h5pEditor,
        `${this.tempFolderPath}/core`, // the path on the local disc where the
        // files of the JavaScript client of the player are stored
        `${this.tempFolderPath}/editor`, // the path on the local disc where the
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
      this.h5pEditor.config.baseUrl,
      createH5PRouter(
        (req, res) => this.onPlay(req, res),
        (req: EditRequestType, res) => this.onEdit(req, res),
        (req: ContentRequestType, res) => this.onNew(req, res),
        (req: ContentRequestType, res) => this.onSave(req, res),
        (req: ContentRequestType, res) => this.onDelete(req, res),
        (req: ContentRequestType, res) => this.onFetch(req, res)
      )
    );
    // The LibraryAdministrationExpress routes are REST endpoints that offer
    // library management functionality.
    server.use(
      `${this.h5pEditor.config.baseUrl}/libraries`,
      libraryAdministrationExpressRouter(this.h5pEditor)
    );

    // The ContentTypeCacheExpress routes are REST endpoints that allow updating
    // the content type cache manually.
    server.use(
      `${this.h5pEditor.config.baseUrl}/content-type-cache`,
      contentTypeCacheExpressRouter(this.h5pEditor.contentTypeCache)
    );
  }

  protected async onPlay(req: any, res: any) {
    try {
      const h5pPage = await this.h5pPlayer.render(
        req.params.contentId,
        req.user,
        this.languageOverride === 'auto'
          ? req.language ?? 'en'
          : this.languageOverride,
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
  }

  protected async onEdit(req: EditRequestType, res: any) {
    // This route merges the render and the /ajax/params routes to avoid a
    // second request.
    const editorModel = (await this.h5pEditor.render(
      req.params.contentId,
      this.languageOverride === 'auto'
        ? req.language ?? 'en'
        : this.languageOverride,
      req.user
    )) as H5P.IEditorModel;
    if (!req.params.contentId || req.params.contentId === 'undefined') {
      res.send(editorModel);
    } else {
      const content = await this.h5pEditor.getContent(req.params.contentId);
      res.send({
        ...editorModel,
        library: content.library,
        metadata: content.params.metadata,
        params: content.params.params,
      });
    }
    res.status(200).end();
  }

  protected async onNew(req: ContentRequestType, res: any) {
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
      await this.h5pEditor.saveOrUpdateContentReturnMetaData(
        undefined!,
        req.body.params.params,
        req.body.params.metadata,
        req.body.library,
        req.user
      );

    res.send(JSON.stringify({ contentId, metadata }));
    res.status(200).end();
  }

  protected async onSave(req: ContentRequestType, res: any) {
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
      await this.h5pEditor.saveOrUpdateContentReturnMetaData(
        req.params.contentId.toString(),
        req.body.params.params,
        req.body.params.metadata,
        req.body.library,
        req.user
      );

    res.send(JSON.stringify({ contentId, metadata }));
    res.status(200).end();
  }

  protected async onDelete(req: ContentRequestType, res: any) {
    try {
      await this.h5pEditor.deleteContent(req.params.contentId, req.user);
    } catch (error: any) {
      res.send(
        `Error deleting content with id ${req.params.contentId}: ${error.message}`
      );
      res.status(500).end();
      return;
    }

    res.send(`Content ${req.params.contentId} successfully deleted.`);
    res.status(200).end();
  }

  protected async onFetch(req: ContentRequestType, res: any) {
    const contentIds = await this.h5pEditor.contentManager.listContent();
    const contentObjects = await Promise.all(
      contentIds.map(async (id) => ({
        content: await this.h5pEditor.contentManager.getContentMetadata(
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
  }
}
