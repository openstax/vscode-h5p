export default class H5PServer {
  public onPlay = jest.fn().mockResolvedValue(null);
  public onEdit = jest.fn().mockResolvedValue(null);
  public onNew = jest.fn().mockResolvedValue(null);
  public onSave = jest.fn().mockResolvedValue(null);
  public onDelete = jest.fn().mockResolvedValue(null);
  public onFetch = jest.fn().mockResolvedValue([{}]);

  public h5pEditor;
  protected configureMiddleware(server, port) {}
  public start(mockEditor, server, port) {
    this.h5pEditor = mockEditor;
    this.configureMiddleware(server, port);
  }
}
