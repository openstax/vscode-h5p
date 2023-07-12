type SupportedLibrary = {
  privateData: string[];
};

export default class Config {
  constructor(
    public workspaceRoot: string,
    public contentPath: string = 'interactives',
    public privatePath: string = 'private',
    public port: number = Number(process.env.PORT) || 27149
  ) {}

  public static readonly supportedLibraries: Record<string, SupportedLibrary> =
    {
      'H5P.Blanks': {
        privateData: ['questions'],
      },
      'H5P.MultiChoice': {
        privateData: ['answers'],
      },
      'H5P.QuestionSet': {
        privateData: []
      }
    };

  public get contentDirectory() {
    return `${this.workspaceRoot}/${this.contentPath}`;
  }

  public get privateContentDirectory() {
    return `${this.workspaceRoot}/${this.privatePath}/${this.contentPath}`;
  }
}
