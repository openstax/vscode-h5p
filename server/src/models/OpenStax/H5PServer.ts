import H5PServer from '../H5PServer';
import express from 'express';
import OSH5PEditor from './H5PEditor';
import path from 'path';

export default class OSH5PServer extends H5PServer<OSH5PEditor> {
  protected async getMetadata(req, res) {
    const id = req.params.contentId;
    try {
      const metadata = await this.h5pEditor.contentStorage.getOSMeta(id);
      res.send(metadata);
      res.status(200).end();
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  }

  protected async saveMetadata(req, res) {
    const id = req.params.contentId;
    const metadata = req.body;
    try {
      await this.h5pEditor.contentStorage.saveOSMeta(id, metadata);
      res.status(200).end();
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  }

  protected createMetadataRouter() {
    const router = express.Router();
    router.get('/:contentId/openstax-metadata/', (req: any, res) =>
      this.getMetadata(req, res)
    );
    router.post('/:contentId/openstax-metadata/', (req: any, res) =>
      this.saveMetadata(req, res)
    );
    return router;
  }

  protected createStaticRouter(staticPath) {
    const router = express.Router();
    router.use(express.static(staticPath));
    return router;
  }

  protected configureMiddleware(server: express.Express, port: number): void {
    super.configureMiddleware(server, port);
    server.use(this.h5pEditor.config.baseUrl, this.createMetadataRouter());
    server.use(
      '/static',
      this.createStaticRouter(path.join(__dirname, 'static'))
    );
  }
}
