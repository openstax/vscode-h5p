import {
  IH5PEditorOptions,
  IHubInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from './config';
import { assertValue, unwrap } from '../../utils';

const supportedLibraryNames = Object.keys(Config.supportedLibraries);

const supportedTags = [
  // Math tags
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

  // Tags that are known to have appeared in exercises
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h5',
  'i',
  'iframe',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'small',
  'span',
  'strong',
  'style',
  'sub',
  'sup',
  'table',
  'td',
  'th',
  'u',
  'ul',
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
  if (semanticMods?.supportsHTML === true) {
    semanticsCopy = addTags(semanticsCopy, supportedTags);
  }
  const overridesForLib = semanticMods?.overrides;
  if (overridesForLib !== undefined) {
    Object.entries(overridesForLib).forEach(([key, overrides]) => {
      const propertyIdx = semanticsCopy.findIndex((s) => s.name === key);
      if (propertyIdx !== -1) {
        const original = semanticsCopy[propertyIdx];
        if (original.fields) {
          semanticsCopy[propertyIdx] = {
            ...original,
            fields: original.fields.map((f) => ({
              ...f,
              ...overrides[f.name],
            })),
          };
        } else {
          semanticsCopy[propertyIdx] = {
            ...original,
            ...overrides,
          };
        }
      }
    });
  }
  return semanticsCopy;
};

/*
  Monkey patch some stuff because the alternative was creating copies of the 
  original classes.
    - SemanticsEnforcer was removing HTML from content.json and this behavior
      was undesired
    - The semanticsEnforcer was a private field of ContentStorer and it was
      initialized by ContentStorer
    - The public methods of ContentStorer that used semanticsEnforcer also
      used private methods of the class
    - H5PEditor#saveOrUpdateContentReturnMetaData was another public method
      that we would have needed to override because
        - Our ContentStorer copy was a different type 
        - H5PEditor created and used its own instance of ContentStorer
    - We would have needed to copy H5PEditor#saveOrUpdateContentReturnMetaData
      and create our own copies of private members to make our override
      function the same as the original
*/
/* istanbul ignore next */
function monkeyPatchH5PEditor(h5pEditor: OSH5PEditor) {
  const tryPatch = (
    ptr: any,
    patch: Record<string, any>,
    fqPath: string[] = []
  ) => {
    for (const [fieldName, value] of Object.entries(patch)) {
      const newPath = [...fqPath, fieldName];
      if (!Reflect.has(ptr, fieldName)) {
        throw new Error(
          `"${newPath.join('.')}" cannot be patched because it does not exist.`
        );
      }
      if (Object.prototype.toString.call(value) === '[object Object]') {
        tryPatch(ptr[fieldName], value, newPath);
      } else {
        ptr[fieldName] = value;
      }
    }
  };

  tryPatch(
    h5pEditor,
    {
      contentStorer: {
        semanticsEnforcer: {
          async enforceSemanticStructure() {
            // PATCH: do not remove html and attributes from content.json
            //
            // Originally this function removed html tags and attributes that
            // were not allowed in the semantics.json of the library.
            // We could extend the list of allowed tags, but we could not
            // extend the list of allowed attributes.
            // This created problems for HTML images, iframes, etc. because
            // important attributes, like src or alt, would be stripped.
          },
        },
      },
    },
    ['h5pEditor']
  );
}

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
            scripts: [`${Config.serverUrl}/static/editor-plugins/mathtype.js`],
          },
          alterLibrarySemantics,
        },
      },
      contentUserDataStorage
    );
    monkeyPatchH5PEditor(this);
  }

  public async getContentTypeCache(
    user: H5P.IUser,
    language?: string | undefined
  ): Promise<IHubInfo> {
    const baseValue = await super.getContentTypeCache(user, language);
    const libsByName = Object.fromEntries(
      baseValue.libraries.map((lib) => [lib.machineName, lib])
    );
    return {
      ...baseValue,
      libraries: supportedLibraryNames.map((name) => unwrap(libsByName[name])),
    };
  }
}
