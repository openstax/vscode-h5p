import H5PServer from '../H5PServer';
import express from 'express';
import OSH5PEditor from './H5PEditor';

export default class OSH5PServer extends H5PServer<OSH5PEditor> {
  protected async getMetadata(req, res) {
    const id = req.params.contentId;
    const metadata = await this.h5pEditor.contentStorage.getOSMeta(id);
    res.send(metadata);
    res.status(200).end();
  }

  protected async saveMetadata(req, res) {
    const id = req.params.contentId;
    const metadata = req.body;
    this.h5pEditor.contentStorage.saveOSMeta(id, metadata);
    res.status(200).end();
  }

  protected configureMiddleware(server: express.Express, port: number): void {
    const router = express.Router();
    super.configureMiddleware(server, port);
    router.get('/:contentId/openstax-metadata/', (req: any, res) =>
      this.getMetadata(req, res)
    );
    router.post('/:contentId/openstax-metadata/', (req: any, res) =>
      this.saveMetadata(req, res)
    );
    server.use(this.h5pEditor.config.baseUrl, router);
  }
}
