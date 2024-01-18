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
import { ISemanticsEntry } from '@lumieducation/h5p-server/build/src/types';
import { assertValue } from '../../../../common/src/utils';

type SupportedLibrary = {
  yankAnswers: Yanker;
  unyankAnswers: Unyanker;
  // Semantic overrides are utilized in the H5PEditor's alterLibrarySemantics
  semantics?: {
    supportsHTML?: boolean;
    override?: (target: ISemanticsEntry, p: string | symbol) => any;
  };
};

export default class Config {
  public readonly contentPath: string;
  public readonly privatePath: string;

  constructor(
    public workspaceRoot: string,
    contentPath: string,
    privatePath: string,
  ) {
    const trimPat = /^[/ ]+|[/ ]+$/g;
    this.contentPath = contentPath?.replace(trimPat, '');
    this.privatePath = privatePath?.replace(trimPat, '');
  }

  public static readonly port: number = Number(process.env.PORT) || 27149;
  /* istanbul ignore next */
  public static readonly serverUrl: string =
    process.env['GITPOD_WORKSPACE_ID'] !== undefined
      ? `https://${Config.port}-${process.env['GITPOD_WORKSPACE_ID']}.${process.env['GITPOD_WORKSPACE_CLUSTER_HOST']}`
      : `http://localhost:${Config.port}`;

  public static readonly supportedLibraries: Record<string, SupportedLibrary> =
    {
      'H5P.Blanks': {
        yankAnswers: blanksYanker,
        unyankAnswers: shallowMerge,
        semantics: {
          supportsHTML: true,
          override(target, p) {
            const value = Reflect.get(target, p);
            if (target.name === 'behaviour' && p === 'fields') {
              const caseSensitive = assertValue(
                value.find(
                  (field: ISemanticsEntry) => field.name === 'caseSensitive',
                ),
                'Could not find caseSensitive semantic entry',
              );
              caseSensitive.default = false;
            }
            return value;
          },
        },
      },
      'H5P.MultiChoice': {
        yankAnswers: multiChoiceYanker,
        unyankAnswers: shallowMerge,
        semantics: {
          supportsHTML: true,
          override(target, p) {
            const value = Reflect.get(target, p);
            if (target.name === 'behaviour' && p === 'fields') {
              const randomAnswers = assertValue(
                value.find(
                  (field: ISemanticsEntry) => field.name === 'randomAnswers',
                ),
                'Could not find randomAnswers semantic entry',
              );
              randomAnswers.default = false;
            }
            return value;
          },
        },
      },
      'H5P.QuestionSet': {
        yankAnswers: questionSetYanker,
        unyankAnswers: questionSetMerge,
        semantics: {
          override(target, p) {
            const value = Reflect.get(target, p);
            if (target.name === 'questions' && p === 'field') {
              const pattern = /^H5P\.(MultiChoice|Blanks|TrueFalse)/;
              value.options = value.options.filter(pattern.test.bind(pattern));
            } else if (target.name === 'randomQuestions' && p === 'default') {
              return false;
            }
            return value;
          },
        },
      },
      'H5P.TrueFalse': {
        yankAnswers: trueFalseYanker,
        unyankAnswers: shallowMerge,
        semantics: {
          supportsHTML: true,
        },
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
