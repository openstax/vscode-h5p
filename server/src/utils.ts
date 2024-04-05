import * as os from 'os';
import decompress from 'decompress';
import fs from 'fs';
import express from 'express';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath-ts';
import {
  assertTrue,
  assertValue,
  isFalsy,
  unwrap,
} from '../../common/src/utils';

export interface MergeOptions {
  customMerge?: (lhs: unknown, rhs: unknown, options?: MergeOptions) => unknown;
  arrayMerge?: (
    lhs: unknown[],
    rhs: unknown[],
    options?: MergeOptions,
  ) => unknown[];
}

/* istanbul ignore next (pure function that depends solely on express) */
export function createH5PRouter<EditRequestType, ContentRequestType>(
  onPlay: (req: any, res: any) => Promise<void>,
  onEdit: (req: EditRequestType, res: any) => Promise<void>,
  onNew: (req: ContentRequestType, res: any) => Promise<void>,
  onSave: (req: ContentRequestType, res: any) => Promise<void>,
  onDelete: (req: ContentRequestType, res: any) => Promise<void>,
  onFetch: (req: ContentRequestType, res: any) => Promise<void>,
): express.Router {
  const router = express.Router();

  router.get('/:contentId/play', onPlay);
  router.get('/:contentId/edit', onEdit);
  router.post('/', onNew);
  router.patch('/:contentId', onSave);
  router.delete('/:contentId', onDelete);
  router.get('/', onFetch);

  return router;
}

export function getIps(external: boolean = false): string[] {
  if (!external) return ['localhost'];
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces).flatMap((devInts) =>
    assertValue(devInts)
      .filter((int: { internal: any }) => isFalsy(int.internal))
      .filter((int: { family: string }) => int.family === 'IPv4')
      .map((int: { address: any }) => int.address),
  );
}

export function fsRemove(folderPath: string) {
  fs.rmSync(folderPath, { recursive: true, force: true });
}

export async function extractArchive(
  path: string,
  destinationFolder: string,
  options?: {
    deleteArchive?: boolean;
    filesToExtract?: string[];
    decompressOptions?: decompress.DecompressOptions;
    verbose?: boolean;
  },
): Promise<void> {
  const {
    deleteArchive,
    filesToExtract,
    decompressOptions = { strip: 0 },
    verbose = true,
  } = options ?? {};
  console.log(`Extracting file ${path}`);
  try {
    const files = await decompress(path, destinationFolder, decompressOptions);
    if (filesToExtract !== undefined) {
      files
        .filter((file) => !filesToExtract.includes(file.path))
        .forEach((file) => fsRemove(file.path));
    }
    if (verbose) {
      (filesToExtract ?? files.map((file) => file.path)).forEach((name) => {
        console.log(`${destinationFolder}/${name}`);
      });
    }
    if (deleteArchive === true) {
      fsRemove(path);
    }
  } catch (e) {
    /* istanbul ignore next */
    console.error(e);
  }
}

export class ParseError extends Error {}

export function parseToDOM(xmlString: string, mimeType = 'application/xml') {
  const locator = { lineNumber: 0, columnNumber: 0 };
  /* istanbul ignore next */
  const cb = () => {
    const pos = {
      line: locator.lineNumber - 1,
      character: locator.columnNumber - 1,
    };
    throw new ParseError(`ParseError: ${JSON.stringify(pos)}`);
  };
  const p = new DOMParser({
    locator,
    errorHandler: {
      warning: console.warn,
      error: cb,
      fatalError: cb,
    },
  });
  const doc = p.parseFromString(xmlString, mimeType);
  return doc;
}

function escapeXml(unsafe: string): string {
  const map: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  };
  return unsafe.replace(/[<>&'"]/g, (c: string) => assertValue(map[c]));
}

export function setNamespaces(
  el: Element,
  nsMap: Record<string, string>,
  mimeType = 'application/xml',
) {
  // Once xmldom decides which namespace is default, there appears to be
  // only two ways to change it:
  // 1. Manually recreate the entire tree
  // 2. Re-parse the tree inside a new root element with new default namespace
  // While option 1 is probably more efficient, it seemed more prone to error
  const serializer = new XMLSerializer();
  // Remove the default namespace the serializer adds if we are to set it
  const src =
    '' in nsMap
      ? serializer.serializeToString(el).replace(/xmlns="[^"]+"/, '')
      : serializer.serializeToString(el);
  const namespaces = Object.entries(nsMap)
    .map(([k, v]) => {
      return k === ''
        ? `xmlns="${escapeXml(v)}"`
        : `xmlns:${escapeXml(k)}="${escapeXml(v)}"`;
    })
    .join(' ');
  const newRoot = parseToDOM(`<root ${namespaces}>${src}</root>`, mimeType);
  const newEl = assertValue(newRoot.documentElement.firstChild) as Element;
  // From this point on, namespace declarations are correctly added as needed
  return newEl;
}

export function parseBooksXML(booksXmlPath: string): {
  booksRoot: string;
  pagesRoot: string;
  mediaRoot: string;
  privateRoot: string;
  publicRoot: string;
} {
  const doc = parseToDOM(fs.readFileSync(booksXmlPath, 'utf-8'));
  const select = xpath.useNamespaces({
    bk: 'https://openstax.org/namespaces/book-container',
  });
  const bookVars: Record<string, string> = Object.fromEntries(
    (select('//bk:var', doc) as Element[]).map((n) =>
      [n.getAttribute('name'), n.getAttribute('value')].map(unwrap).map((i) => {
        const trimmed = i.trim();
        if (trimmed.length === 0) {
          /* istanbul ignore next */
          throw new Error('Found empty var in books.xml');
        }
        return trimmed;
      }),
    ),
  );
  return {
    booksRoot: bookVars['BOOKS_ROOT'] ?? '/collections',
    pagesRoot: bookVars['PAGES_ROOT'] ?? '/modules',
    mediaRoot: bookVars['MEDIA_ROOT'] ?? '/media',
    privateRoot: bookVars['PRIVATE_ROOT'] ?? '/private',
    publicRoot: bookVars['PUBLIC_ROOT'] ?? '/interactives',
  };
}

export function mergeByIndex(
  lhs: unknown[],
  rhs: unknown[],
  options?: MergeOptions,
) {
  return Object.values(
    recursiveMerge(
      Object.fromEntries(Object.entries(lhs)),
      Object.fromEntries(Object.entries(rhs)),
      options,
    ) as object,
  );
}

export function defaultValueMerge(lhs: unknown, rhs: unknown) {
  if (lhs != null && rhs != null) {
    throw new Error(`Cannot merge values: ${lhs} and ${rhs}`);
  }
  return rhs ?? lhs;
}

export function recursiveMerge(
  lhs: unknown,
  rhs: unknown,
  options?: MergeOptions,
): unknown {
  const { arrayMerge = mergeByIndex, customMerge = defaultValueMerge } =
    options ?? {};
  if (
    typeof lhs === 'object' &&
    typeof rhs === 'object' &&
    lhs != null &&
    rhs != null
  ) {
    const isArrayL = Array.isArray(lhs);
    const isArrayR = Array.isArray(rhs);
    if (isArrayL || isArrayR) {
      assertTrue(isArrayL && isArrayR, 'Expected two arrays');
      return arrayMerge(lhs as unknown[], rhs as unknown[], options);
    } else {
      const keysL = Object.keys(lhs);
      const keysR = Object.keys(rhs);
      const sharedKeys = keysL.filter((k) => keysR.indexOf(k) !== -1);
      const merged = Object.fromEntries(
        sharedKeys.map((k) => [
          k,
          recursiveMerge(Reflect.get(lhs, k), Reflect.get(rhs, k), options),
        ]),
      );
      return { ...lhs, ...rhs, ...merged };
    }
  } else {
    return customMerge(lhs, rhs, options);
  }
}
