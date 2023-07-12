import {
  IH5PEditorOptions,
  IHubInfo,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from '../config';

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
      options,
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
      )
    };
  }
}
