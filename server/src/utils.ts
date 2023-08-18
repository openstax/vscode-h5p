import * as os from 'os';
import decompress from 'decompress';
import fs from 'fs';
import fetch from 'node-fetch';
import express from 'express';
import * as H5P from '@lumieducation/h5p-server';
import User from './models/H5PUser';

/* istanbul ignore next (pure function that depends solely on express) */
export function createH5PRouter<EditRequestType, ContentRequestType>(
  onPlay: (req, res) => Promise<void>,
  onEdit: (req: EditRequestType, res) => Promise<void>,
  onNew: (req: ContentRequestType, res) => Promise<void>,
  onSave: (req: ContentRequestType, res) => Promise<void>,
  onDelete: (req: ContentRequestType, res) => Promise<void>,
  onFetch: (req: ContentRequestType, res) => Promise<void>
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
  h5PEditor: H5P.H5PEditor
): Promise<any> {
  console.log(`Updating libraries`);
  const res = await fetch(`http://${hostname}:${port}${path}`).then((res) =>
    res.json()
  );
  const user = new User();
  return Promise.all(
    res.libraries
      .filter((lib) => !lib.installed || !lib.isUpToDate)
      .map((lib) => lib.machineName)
      .map(async (libraryName) => {
        console.log(`Installing ${libraryName}`);
        return h5PEditor
          .installLibraryFromHub(libraryName, user)
          .then((res) => {
            console.log(res);
          });
      })
  );
}

export function getIps(external: boolean = false): string[] {
  if (!external) return ['localhost'];
  const interfaces = os.networkInterfaces();
  return (
    interfaces &&
    Object.values(interfaces).flatMap((devInts) =>
      devInts!
        .filter((int: { internal: any }) => !int.internal)
        .filter((int: { family: string }) => int.family === 'IPv4')
        .map((int: { address: any }) => int.address)
    )
  );
}

export async function fsRemove(folderPath: string) {
  fs.rmSync(folderPath, { recursive: true, force: true });
}

export async function download(
  url: string,
  destinationPath: string
): Promise<void> {
  console.debug(`Downloading ${url} to ${destinationPath}`);

  const fileStream = fs.createWriteStream(destinationPath);
  const res = await fetch(url);
  await new Promise((resolve, reject) => {
    res.body!.pipe(fileStream);
    res.body!.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

export async function extractArchive(
  path: string,
  destinationFolder: string,
  deleteArchive: boolean,
  filesToExtract?: string[],
  opt: decompress.DecompressOptions = { strip: 1 }
): Promise<void> {
  console.log(`Extracting file ${path}`);
  try {
    const files = await decompress(path, destinationFolder, opt);
    console.log('Files extracted');
    if (filesToExtract) {
      files
        .filter((file) => !filesToExtract.includes(file.path))
        .forEach((file) => fsRemove(file.path));
      filesToExtract.forEach((file) =>
        console.log(`${destinationFolder}/${file}`)
      );
    } else {
      files.forEach((file) => console.log(`${destinationFolder}/${file.path}`));
    }
    if (deleteArchive) fsRemove(path);
  } catch (e) {
    /* istanbul ignore next */
    console.error(e);
  }
}
