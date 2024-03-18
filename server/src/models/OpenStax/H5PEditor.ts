import {
  IH5PEditorOptions,
  IHubContentTypeWithLocalInfo,
  IHubInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import * as H5P from '@lumieducation/h5p-server';
import OSStorage from './FileContentStorage';
import Config from './config';
import { assertTrue, assertValue } from '../../../../common/src/utils';
import { walkJSON } from './ContentMutators';

const _supportedLibraryNames = Object.keys(Config.supportedLibraries);

const _supportedTags = [
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
  'html', // This tag is what activates the editor plugin (addons.js)
];

type Mutator = (entry: ISemanticsEntry, fqPath: string[]) => void;

function _isSemanticsEntry(obj: unknown): obj is ISemanticsEntry {
  return obj != null && Reflect.has(obj, 'type');
}

function _addTags(entry: ISemanticsEntry) {
  if (entry.type === 'text' && entry.widget === 'html') {
    const entryTags = entry.tags ?? [];
    // Avoid duplication (can be a problem with H5P.QuestionSet)
    if (entryTags.indexOf('html') === -1) {
      entry.tags = entryTags.concat(_supportedTags);
    }
  }
}

export const alterLibrarySemantics = (
  library: H5P.LibraryName,
  semantics: ISemanticsEntry[],
) => {
  const mutations: Mutator[] = [];
  const semanticsCopy: ISemanticsEntry[] = JSON.parse(
    JSON.stringify(semantics),
  );
  const semanticMods =
    Config.supportedLibraries[library.machineName]?.semantics;
  const overrideForLib = semanticMods?.override;
  const additionalFields = semanticMods?.additionalFields;
  if (overrideForLib !== undefined) {
    mutations.push(overrideForLib);
  }
  mutations.push(_addTags);
  if (additionalFields !== undefined) {
    additionalFields.forEach((addField) => {
      const index =
        addField.index === undefined || addField.index > semanticsCopy.length
          ? semanticsCopy.length
          : addField.index;
      semanticsCopy.splice(index, 0, addField.field);
    });
  }
  walkJSON(semanticsCopy, (field) => {
    const { type, value, fqPath } = field;
    if (type === 'object' && _isSemanticsEntry(value)) {
      mutations.forEach((mut) => mut(value, fqPath));
    }
  });
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
function monkeyPatchH5PEditor(h5pEditor: OSH5PEditor) {
  const tryPatch = (ptr: any, patch: Record<string, any>, fqPath: string[]) => {
    for (const [fieldName, value] of Object.entries(patch)) {
      const newPath = [...fqPath, fieldName];
      assertTrue(
        Reflect.has(ptr, fieldName),
        `"${newPath.join('.')}" cannot be patched because it does not exist.`,
      );
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
    ['h5pEditor'],
  );
}

export function filterLibs(
  libraries: IHubContentTypeWithLocalInfo[],
  supportedLibraryNames: string[],
) {
  const libsByName = Object.fromEntries(
    libraries.map((lib) => [lib.machineName, lib]),
  );
  return supportedLibraryNames.map((name) => assertValue(libsByName[name]));
}

export default class OSH5PEditor extends H5P.H5PEditor {
  constructor(
    cache: H5P.IKeyValueStorage,
    config: H5P.IH5PConfig,
    libraryStorage: H5P.ILibraryStorage,
    // Change type in server from IContentStorage to OSStorage by making this public readonly
    public override readonly contentStorage: OSStorage,
    temporaryStorage: H5P.ITemporaryFileStorage,
    translationCallback?: H5P.ITranslationFunction | undefined,
    urlGenerator?: H5P.IUrlGenerator | undefined,
    options?: IH5PEditorOptions | undefined,
    contentUserDataStorage?: H5P.IContentUserDataStorage | undefined,
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
              `${Config.serverUrl}/static/editor-plugins/addons.js`,
              `${Config.serverUrl}/static/common-plugins/baseurl.js`,
            ],
          },
          alterLibrarySemantics,
        },
      },
      contentUserDataStorage,
    );
    monkeyPatchH5PEditor(this);
  }

  /* istanbul ignore next */
  public override async getContentTypeCache(
    user: H5P.IUser,
    language?: string | undefined,
  ): Promise<IHubInfo> {
    const baseValue = await super.getContentTypeCache(user, language);
    return {
      ...baseValue,
      libraries: filterLibs(baseValue.libraries, _supportedLibraryNames),
    };
  }
}
