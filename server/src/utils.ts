import * as os from 'os';
import decompress from 'decompress';
import fs from 'fs';
import fetch from 'node-fetch';

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

export function userContentId() {
  const min = 1e8;
  const max = 9e8;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function extractArchive(
  path: string,
  destinationFolder: string,
  deleteArchive: boolean,
  tempFolder?: string,
  filesToExtract?: string[]
): Promise<void> {
  console.log(`Extracting file ${path}`);
  const fileExists = fs.statSync(path);
  if (fileExists) {
    return await decompress(path, destinationFolder, { strip: 1 })
      .then((files) => {
        console.log('Files extracted');
        if (filesToExtract) {
          files
            .filter((file) => !filesToExtract.includes(file.path))
            .forEach((file) => fsRemove(file.path));
          filesToExtract.forEach((file) =>
            console.log(`${destinationFolder}/${file}`)
          );
        } else {
          files.forEach((file) =>
            console.log(`${destinationFolder}/${file.path}`)
          );
        }
        if (deleteArchive) fsRemove(path);
      })
      .catch((error) => {
        console.error(error);
      });
  }
  return Promise.resolve();
}
