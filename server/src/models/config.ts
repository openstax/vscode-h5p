export default class Config {
  constructor(
    public workspaceRoot: string,
    public contentPath: string = 'interactives',
    public port: number = Number(process.env.PORT) || 27149
  ) {}

  public get contentDirectory() {
    return `${this.workspaceRoot}/${this.contentPath}`;
  }
}
