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
  const lastBuildTime = fsExtra.existsSync(archiveFile)
    ? fsExtra.statSync(archiveFile).ctimeMs
    : 0;
  const now = Number(new Date());
  // Only check every 8 hours
  // Maybe it should check each time when env = production?
  if (now - lastBuildTime > 8 * 3600000) {
    // TODO: Get previous version of the libraries and include them in the final tar file
    console.log('Downloading libraries...');
    const response = await fetch(config.hubContentTypesEndpoint, {
      method: 'POST',
      body: qs.stringify(registrationData),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = (await response.json()).contentTypes;
    await Promise.all(
      Object.keys(Config.supportedLibraries)
        .filter((libraryName) => {
          const lib = data.find((item) => item.id === libraryName);
          if (lib == null) {
            throw new Error(`Could not find "${libraryName}"`);
          }
          return Number(new Date(lib.updatedAt)) > lastBuildTime;
        })
        .map(async (libraryName) => {
          console.log(`Installing ${libraryName}`);
          await h5pEditor.installLibraryFromHub(libraryName, user);
        })
    );
    process.chdir(tempFolderPath);
    await tar.c(
      {
        gzip: true,
        file: archiveFile,
      },
      ['libraries']
    );
    process.chdir(__dirname);
    fsExtra.rmSync(tempFolderPath, { recursive: true });
  } else {
    console.log('Skipping library download...');
  }
}

main().catch((err) => {
  throw new Error(err);
});
