import * as os from 'os';
import decompress from 'decompress';
import fs from 'fs';
import fetch from 'node-fetch';
import express from 'express';
import * as H5P from '@lumieducation/h5p-server';
import User from './models/H5PUser';
import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath-ts';
import { assertValue, isFalsy, unwrap } from '../../common/src/utils';

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

export async function downloadLibraries(
  hostname: string,
  port: number,
  path: string,
  h5PEditor: H5P.H5PEditor,
): Promise<any> {
  console.log('Updating libraries');
  const res = await (await fetch(`http://${hostname}:${port}${path}`)).json();
  const user = new User();
  await Promise.all(
    res.libraries
      .filter((lib: any) => isFalsy(lib.installed) || isFalsy(lib.isUpToDate))
      .map((lib: any) => lib.machineName)
      .map(async (libraryName: string) => {
        console.log(`Installing ${libraryName}`);
        const res = await h5PEditor.installLibraryFromHub(libraryName, user);
        console.log(res);
      }),
  );
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

export async function fsRemove(folderPath: string) {
  fs.rmSync(folderPath, { recursive: true, force: true });
}

export async function download(
  url: string,
  destinationPath: string,
): Promise<void> {
  console.debug(`Downloading ${url} to ${destinationPath}`);

  const fileStream = fs.createWriteStream(destinationPath);
  const res = await fetch(url);
  const body = assertValue(res.body);
  await new Promise((resolve, reject) => {
    body.pipe(fileStream);
    body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

export async function extractArchive(
  path: string,
  destinationFolder: string,
  deleteArchive: boolean,
  filesToExtract?: string[],
  opt: decompress.DecompressOptions = { strip: 1 },
): Promise<void> {
  console.log(`Extracting file ${path}`);
  try {
    const files = await decompress(path, destinationFolder, opt);
    console.log('Files extracted');
    if (filesToExtract) {
      files
        .filter((file) => !filesToExtract.includes(file.path))
        .forEach((file) => fsRemove(file.path));
      filesToExtract.forEach((file) => {
        console.log(`${destinationFolder}/${file}`);
      });
    } else {
      files.forEach((file) => console.log(`${destinationFolder}/${file.path}`));
    }
    if (deleteArchive) fsRemove(path);
  } catch (e) {
    /* istanbul ignore next */
    console.error(e);
  }
}

export class ParseError extends Error {}

export function parseXML(xmlString: string) {
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
  const doc = p.parseFromString(xmlString);
  return doc;
}

export function parseBooksXML(booksXmlPath: string): {
  booksRoot: string;
  pagesRoot: string;
  mediaRoot: string;
  privateRoot: string;
  publicRoot: string;
} {
  const doc = parseXML(fs.readFileSync(booksXmlPath, 'utf-8'));
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
