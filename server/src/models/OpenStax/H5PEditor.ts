import {
  IH5PEditorOptions,
  IHubInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from './config';
import { unwrap } from '../../utils';

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
    return semantics.map((s) => {
      const copy = { ...s };
      let ptr = copy;
      while (ptr.type === 'list') {
        ptr.field = { ...unwrap(ptr.field) };
        ptr = ptr.field;
      }
      if (ptr.type === 'group') {
        ptr.fields = addTags(unwrap(ptr.fields), tags);
      } else if (ptr.type === 'text' && ptr.widget === 'html') {
        ptr.tags = (ptr.tags ?? []).concat(tags);
      }
      return copy;
    });
  };
  let semanticsCopy = [...semantics];
  const semanticMods =
    config.supportedLibraries[library.machineName]?.semantics;
  if (semanticMods?.supportsMath === true) {
    semanticsCopy = addTags(semanticsCopy, mathTags);
  }
  const behaviourOverrides = semanticMods?.behaviourOverrides;
  if (behaviourOverrides !== undefined) {
    const behaviourIdx = semanticsCopy.findIndex((s) => s.name === 'behaviour');
    if (behaviourIdx !== -1) {
      const original = semanticsCopy[behaviourIdx];
      semanticsCopy[behaviourIdx] = {
        ...original,
        fields: original.fields?.map((f) => ({
          ...f,
          ...behaviourOverrides[f.name],
        })),
      };
    }
  }
  return semanticsCopy;
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
