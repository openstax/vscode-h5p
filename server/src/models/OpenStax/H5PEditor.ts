import {
  IH5PEditorOptions,
  IHubInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from './config';

const supportedLibraryNames = Object.keys(Config.supportedLibraries);

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
          alterLibrarySemantics(library, semantics) {
            const addMathTag = (semantics: ISemanticsEntry[]) => {
              for (let field of semantics) {
                while (field.type === 'list') {
                  field = field.field!;
                }
                if (field.type === 'group') {
                  addMathTag(field.fields!);
                  continue;
                }
                if (field.type === 'text' && field.widget === 'html') {
                  field.tags = (field.tags ?? []).concat(['math']);
                }
              }
            };
            const semanticMods =
              Config.supportedLibraries[library.machineName]?.semantics;
            const clone: ISemanticsEntry[] = semantics.map((obj) => ({
              ...obj,
            }));
            if (semanticMods?.supportsMath === true) {
              addMathTag(clone);
            }
            const overrides = semanticMods?.behaviourOverrides;
            if (overrides !== undefined) {
              const behaviorSettings = clone.find(
                (s) => s.name === 'behaviour'
              );
              if (behaviorSettings?.fields !== undefined) {
                behaviorSettings.fields = behaviorSettings.fields.map((f) => ({
                  ...f,
                  ...overrides[f.name],
                }));
              }
            }
            return clone;
          },
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
