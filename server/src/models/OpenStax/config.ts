import * as H5P from '@lumieducation/h5p-server';
import {
  Unyanker,
  Yanker,
  blanksYanker,
  multiChoiceYanker,
  questionSetMerge,
  questionSetYanker,
  shallowMerge,
  trueFalseYanker,
} from './AnswerYankers';

type SupportedLibrary = {
  yankAnswers: Yanker;
  unyankAnswers: Unyanker;
  semantics?: {
    supportsMath?: boolean;
    behaviourOverrides?: Record<string, Record<string, any>>;
  };
};

export default class Config {
  constructor(
    public workspaceRoot: string,
    public contentPath: string = 'interactives',
    public privatePath: string = 'private'
  ) {}

  public static readonly port: number = Number(process.env.PORT) || 27149;
  /* istanbul ignore next */
  public static readonly serverUrl: string = process.env['GITPOD_WORKSPACE_ID']
    ? `https://${Config.port}-${process.env['GITPOD_WORKSPACE_ID']}.${process.env['GITPOD_WORKSPACE_CLUSTER_HOST']}`
    : `http://localhost:${Config.port}`;

  public static readonly supportedLibraries: Record<string, SupportedLibrary> =
    {
      'H5P.Blanks': {
        yankAnswers: blanksYanker,
        unyankAnswers: shallowMerge,
        semantics: {
          supportsMath: true,
          behaviourOverrides: {
            enableRetry: {
              default: false,
            },
            enableSolutionsButton: {
              default: false,
            },
          },
        },
      },
      'H5P.MultiChoice': {
        yankAnswers: multiChoiceYanker,
        unyankAnswers: shallowMerge,
        semantics: {
          supportsMath: true,
        },
      },
      'H5P.QuestionSet': {
        yankAnswers: questionSetYanker,
        unyankAnswers: questionSetMerge,
      },
      'H5P.TrueFalse': {
        yankAnswers: trueFalseYanker,
        unyankAnswers: shallowMerge,
      },
    };

  public static readonly h5pConfig: Partial<H5P.IH5PConfig> = {
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
  };

  public static readonly h5pServerArchiveName = `h5p-server.tar.gz`;

  public get contentDirectory() {
    return `${this.workspaceRoot}/${this.contentPath}`;
  }

  public get privateContentDirectory() {
    return `${this.workspaceRoot}/${this.privatePath}/${this.contentPath}`;
  }
}
