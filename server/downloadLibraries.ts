import * as os from 'os';
import * as H5P from '@lumieducation/h5p-server';
import Config from './src/models/config';
import User from './src/models/H5PUser';
import { createH5PEditor } from './src/createH5PServer';
import { machineIdSync } from 'node-machine-id';
import * as qs from 'qs';
import fetch from 'node-fetch';
import fsExtra from 'fs-extra';
import * as tar from 'tar';
import { extractArchive } from './src/utils';
import path from 'path';

const archiveFile = `${__dirname}/out/${Config.librariesArchiveName}`;
const tempFolderPath = os.tmpdir() + '/h5p_builder';
const config = new H5P.H5PConfig(undefined, Config.h5pConfig);
const h5pEditor = createH5PEditor(
  config,
  `${tempFolderPath}/libraries`,
  new Config(tempFolderPath),
  `${tempFolderPath}/temporary-storage`,
  `${tempFolderPath}/user-data`,
  new H5P.UrlGenerator(config),
  undefined,
  undefined
);

const registrationData = {
  core_api_version: `${config.coreApiVersion.major}.${config.coreApiVersion.minor}`,
  disabled: config.fetchingDisabled,
  h5p_version: config.h5pVersion,
  local_id: machineIdSync(),
  platform_name: config.platformName,
  platform_version: config.platformVersion,
  type: config.siteType,
  uuid: config.uuid,
};

const user = new User();

async function main() {
  console.log('Updating libraries...');
  const response = await fetch(config.hubContentTypesEndpoint, {
    method: 'POST',
    body: qs.stringify(registrationData),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const data = (await response.json()).contentTypes;
  const librariesPath = `${tempFolderPath}/libraries`;
  // Include existing versions of libraries
  if (fsExtra.pathExistsSync(archiveFile)) {
    await extractArchive(archiveFile, librariesPath, false);
  }
  const existingLibraries = await Promise.all(
    fsExtra
      .readdirSync(librariesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map(async (dirent) => ({
        name: dirent.name,
        ...(await fsExtra.readJSON(
          `${librariesPath}/${dirent.name}/library.json`
        )),
      }))
  );
  const toInstall = Object.keys(Config.supportedLibraries).filter(
    (libraryName) => {
      const lib = data.find((item) => item.id === libraryName);
      if (lib == null) {
        throw new Error(`Could not find "${libraryName}"`);
      }
      // Are there any existing libraries with the exact version?
      return !existingLibraries
        .filter((existingLib) => existingLib.name.startsWith(libraryName))
        .some(
          (existingLib) =>
            existingLib.majorVersion === lib.version.major &&
            existingLib.minorVersion === lib.version.minor &&
            existingLib.patchVersion === lib.version.patch
        );
    }
  );
  if (toInstall.length === 0) {
    console.log('Libraries already up-to-date.');
    return;
  }
  await Promise.all(
    toInstall.map(async (libraryName) => {
      for (let tries = 2; tries--; tries > 0) {
        try {
          console.log(`Installing ${libraryName}`);
          await h5pEditor.installLibraryFromHub(libraryName, user);
          break;
        } catch (e) {
          if (tries === 0) {
            throw e;
          } else {
            console.error(`Could not install "${libraryName}". Retrying...`);
          }
        }
      }
    })
  );
  fsExtra.ensureDirSync(path.dirname(archiveFile));
  // Chdir into temp folder so the archived file paths are relative to that location
  process.chdir(tempFolderPath);
  await tar.c(
    {
      gzip: true,
      file: archiveFile,
    },
    ['libraries']
  );
  process.chdir(__dirname);
}

main()
  .catch((err) => {
    throw new Error(err);
  })
  .finally(() => {
    console.log('Cleaning up temporary directory...');
    fsExtra.rmSync(tempFolderPath, { recursive: true, force: true });
  });
