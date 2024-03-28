import * as H5P from '@lumieducation/h5p-server';
import { Yanker, chain, yankByKeysFactory } from './AnswerYankers';
import { ISemanticsEntry } from '@lumieducation/h5p-server/build/src/types';
import { assertTrue, assertValue } from '../../../../common/src/utils';
import { QuestionSetQuestion, toQuestionSet } from './helpers';

type GetSolutionIsPublic = (content: Partial<unknown>) => boolean;

interface SemanticsOverride {
  /**
   * Alter an existing field. See the semantics.json for the library you
   * wish to alter for more information. When defined, this function will be
   * called on each field that exists in the library's semantics.
   */
  override?: (target: ISemanticsEntry) => void;
  /**
   * Add additional fields to a libraries semantics.
   * You can optionally specify a zero-based index for the new field if you
   * want some control over where the field appears. The field will be
   * appended to the end by default.
   */
  additionalFields?: AdditionalField[];
}

interface SupportedLibrary {
  yankAnswers: Yanker;
  isSolutionPublic: GetSolutionIsPublic;
  // Semantic overrides are utilized in the H5PEditor's alterLibrarySemantics
  semantics?: SemanticsOverride;
}

interface LibraryOptions {
  semantics?: SemanticsOverride;
  /**
   * Library-specific yanker implementation (will be chained to key yanker)
   */
  yankAnswers?: Yanker;
  isSolutionPublic?: GetSolutionIsPublic;
}

interface AdditionalField {
  index?: number;
  field: ISemanticsEntry;
  private?: boolean;
}

const summarySolution: AdditionalField = {
  field: {
    name: 'summarySolution',
    type: 'text',
    importance: 'medium',
    optional: true,
    widget: 'html',
    label: 'Summary Solution',
  },
  private: true,
};

const detailedSolution: AdditionalField = {
  field: {
    name: 'detailedSolution',
    type: 'text',
    importance: 'medium',
    optional: true,
    widget: 'html',
    label: 'Detailed Solution',
  },
  private: true,
};

const questionSetStimulus: ISemanticsEntry = {
  name: 'questionSetStimulus',
  type: 'text',
  importance: 'medium',
  optional: true,
  widget: 'html',
  label: 'Question Set Stimulus',
};

const publicSolution: AdditionalField = {
  field: {
    name: 'isSolutionPublic',
    type: 'boolean',
    importance: 'medium',
    default: false as unknown as string,
    label: 'Solution Is Public',
  },
  private: false,
};

const collaboratorSolutions: AdditionalField[] = [
  summarySolution,
  detailedSolution,
];

export function newSupportedLibrary(
  options?: LibraryOptions,
): SupportedLibrary {
  // Implement private fields
  const additionalFields = options?.semantics?.additionalFields;
  const additionalFieldsYanker: Yanker | undefined =
    additionalFields !== undefined && additionalFields.length > 0
      ? yankByKeysFactory(
          ...additionalFields
            .filter((f) => f.private === true)
            .map((f) => f.field.name),
        )
      : undefined;
  const yankAnswers: Yanker | undefined =
    options?.yankAnswers !== undefined && additionalFieldsYanker !== undefined
      ? chain(options.yankAnswers, additionalFieldsYanker)
      : additionalFieldsYanker ?? options?.yankAnswers;

  // Implement public solutions checkbox
  const solutionIsPublicGetters: GetSolutionIsPublic[] = [];
  if (options?.isSolutionPublic !== undefined) {
    solutionIsPublicGetters.push(options.isSolutionPublic);
  }
  if (
    additionalFields !== undefined &&
    additionalFields.some((f) => f.field.name === publicSolution.field.name)
  ) {
    solutionIsPublicGetters.push(
      (content) => Reflect.get(content, publicSolution.field.name) === true,
    );
  }
  assertTrue(
    solutionIsPublicGetters.length !== 0,
    'BUG: Expected at least one isSolutionPublic implementation',
  );

  return {
    semantics: options?.semantics,
    yankAnswers: assertValue(
      yankAnswers,
      'BUG: Expected answer yanker, got undefined',
    ),
    isSolutionPublic: (content) =>
      solutionIsPublicGetters.every((getter) => getter(content)),
  };
}

function getLibraryForQuestion(q: QuestionSetQuestion): SupportedLibrary {
  const libraryName = assertValue(
    q.library?.split(' ')[0],
    'Could not get library name',
  );
  return assertValue(
    Config.supportedLibraries[libraryName],
    `Library, "${libraryName}," is unsupported`,
  );
}

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
      'H5P.Blanks': newSupportedLibrary({
        yankAnswers: yankByKeysFactory('questions'),
        semantics: {
          additionalFields: [...collaboratorSolutions, publicSolution],
          override(entry) {
            if (entry.name === 'behaviour') {
              const fields = entry.fields ?? (entry.fields = []);
              const caseSensitive = assertValue(
                fields.find(
                  (field: ISemanticsEntry) => field.name === 'caseSensitive',
                ),
                'Could not find caseSensitive semantic entry',
              );
              caseSensitive.default = false as unknown as string;
            }
          },
        },
      }),
      'H5P.MultiChoice': newSupportedLibrary({
        yankAnswers: yankByKeysFactory('answers'),
        semantics: {
          additionalFields: [...collaboratorSolutions, publicSolution],
          override(entry) {
            if (entry.name === 'behaviour') {
              const fields = entry.fields ?? (entry.fields = []);
              const randomAnswers = assertValue(
                fields.find(
                  (field: ISemanticsEntry) => field.name === 'randomAnswers',
                ),
                'Could not find randomAnswers semantic entry',
              );
              randomAnswers.default = false as unknown as string;
            }
          },
        },
      }),
      'H5P.QuestionSet': newSupportedLibrary({
        semantics: {
          additionalFields: [{ field: questionSetStimulus, index: 0 }],
          override(entry) {
            if (entry.name === 'questions') {
              const field = assertValue(
                entry.field,
                'Could not get questions.field',
              );
              const options = assertValue(
                field.options,
                'Could not get questions.field.options',
              );
              const pattern = new RegExp(
                `^(${Object.keys(Config.supportedLibraries).join('|')})`,
              );
              field.options = options.filter(pattern.test.bind(pattern));
            } else if (entry.name === 'randomQuestions') {
              entry.default = false as unknown as string;
            }
          },
        },
        isSolutionPublic: (content) =>
          toQuestionSet(content).questions.every((q) =>
            getLibraryForQuestion(q).isSolutionPublic(q.params),
          ),
        yankAnswers: (content) => {
          const copy = JSON.parse(JSON.stringify(content));
          const publicData = toQuestionSet(copy);
          const privateData = { questions: [] };
          const privateQuestions: Array<{ params: unknown }> =
            privateData.questions;
          publicData.questions = publicData.questions.map((q) => {
            const libraryConfig = getLibraryForQuestion(q);
            if (libraryConfig.isSolutionPublic(q.params)) {
              privateQuestions.push({ params: null });
              return q;
            } else {
              const [pub, priv] = libraryConfig.yankAnswers(q.params);
              privateQuestions.push({ params: priv });
              return {
                ...q,
                params: pub,
              };
            }
          });
          return [publicData, privateData];
        },
      }),
      'H5P.TrueFalse': newSupportedLibrary({
        yankAnswers: yankByKeysFactory('correct'),
        semantics: {
          additionalFields: [...collaboratorSolutions, publicSolution],
        },
      }),
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

  public static readonly h5pServerArchiveName = 'h5p-server.tar.gz';
  public static readonly librariesName = 'libraries';
  public static readonly configName = 'config.json';

  public get contentDirectory() {
    return `${this.workspaceRoot}/${this.contentPath}`;
  }

  public get privateContentDirectory() {
    return `${this.workspaceRoot}/${this.privatePath}/${this.contentPath}`;
  }
}
