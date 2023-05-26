import H5PServer from './H5PServer';

export default class OpenstaxH5PServer extends H5PServer {
  protected async onPlay(req: any, res: any): Promise<void> {
    console.log('Doing things and stuff');
    await super.onPlay(req, res);
  }
}
