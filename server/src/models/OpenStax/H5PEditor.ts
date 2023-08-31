import {
  IH5PEditorOptions,
  IHubInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from './config';

const supportedLibraryNames = Object.keys(Config.supportedLibraries);

const mathTags = [
  'math',
  'maction',
  'annotation',
  'annotation-xml',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'semantics',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msup',
  'msubsup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'math',
  'mi',
  'mn',
  'mo',
  'ms',
  'mspace',
  'mtext',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mpadded',
  'mphantom',
  'mroot',
  'mrow',
  'msqrt',
  'mstyle',
  'mmultiscripts',
  'mover',
  'mprescripts',
  'msub',
  'msubsup',
  'msup',
  'munder',
  'munderover',
  'mtable',
  'mtd',
  'mtr',
  'maction',
  'annotation',
  'annotation-xml',
  'semantics',
];

export const alterLibrarySemantics = (
  library: H5P.LibraryName,
  semantics: ISemanticsEntry[],
  config = Config
) => {
  const addTags = (semantics: ISemanticsEntry[], tags: string[]) => {
    // Based on https://h5p.org/adding-text-editor-buttons#highlighter_482820
    for (let field of semantics) {
      while (field.type === 'list') {
        field = field.field!;
      }
      if (field.type === 'group') {
        addTags(field.fields!, tags);
        continue;
      }
      if (field.type === 'text' && field.widget === 'html') {
        field.tags = (field.tags ?? []).concat(tags);
      }
    }
  };
  const semanticMods =
    config.supportedLibraries[library.machineName]?.semantics;
  const clone: ISemanticsEntry[] = semantics.map((obj) => ({
    ...obj,
  }));
  if (semanticMods?.supportsMath === true) {
    addTags(clone, mathTags);
  }
  const overrides = semanticMods?.behaviourOverrides;
  if (overrides !== undefined) {
    const behaviorSettings = clone.find((s) => s.name === 'behaviour');
    if (behaviorSettings?.fields !== undefined) {
      behaviorSettings.fields = behaviorSettings.fields.map((f) => ({
        ...f,
        ...overrides[f.name],
      }));
    }
  }
  return clone;
};

export default class OSH5PEditor extends H5P.H5PEditor {
  constructor(
    cache: H5P.IKeyValueStorage,
    config: H5P.IH5PConfig,
    libraryStorage: H5P.ILibraryStorage,
    // Change type in server from IContentStorage to OSStorage by making this public readonly
    public readonly contentStorage: OSStorage,
    temporaryStorage: H5P.ITemporaryFileStorage,
    translationCallback?: H5P.ITranslationFunction | undefined,
    urlGenerator?: H5P.IUrlGenerator | undefined,
    options?: IH5PEditorOptions | undefined,
    contentUserDataStorage?: H5P.IContentUserDataStorage | undefined
  ) {
    super(
      cache,
      config,
      libraryStorage,
      contentStorage,
      temporaryStorage,
      translationCallback,
      urlGenerator,
      {
        ...options,
        customization: {
          ...options?.customization,
          global: {
            scripts: [
              `${Config.serverUrl}/static/ckeditor-plugins/mathtype.js`,
            ],
          },
          alterLibrarySemantics,
        },
      },
      contentUserDataStorage
    );
  }

  public async getContentTypeCache(
    user: H5P.IUser,
    language?: string | undefined
  ): Promise<IHubInfo> {
    const baseValue = await super.getContentTypeCache(user, language);
    return {
      ...baseValue,
      libraries: baseValue.libraries.filter((lib) =>
        supportedLibraryNames.includes(lib.machineName)
      ),
    };
  }
}
