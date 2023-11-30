export default class H5PServer {
  public onPlay = jest.fn().mockResolvedValue(null);
  public onEdit = jest.fn().mockResolvedValue(null);
  public onNew = jest.fn().mockResolvedValue(null);
  public onSave = jest.fn().mockResolvedValue(null);
  public onDelete = jest.fn().mockResolvedValue(null);
  public onFetch = jest.fn().mockResolvedValue([{}]);
  public handleError = jest.fn();

  public h5pEditor: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected configureMiddleware(_server: any) {}
  public start(mockEditor: any, server: any) {
    this.h5pEditor = mockEditor;
    this.configureMiddleware(server);
  }
}
