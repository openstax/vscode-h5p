import { IH5PEditorOptions } from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';

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
}
