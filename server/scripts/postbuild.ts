import * as os from 'os';
import * as H5P from '@lumieducation/h5p-server';
import Config from '../src/models/OpenStax/config';
import User from '../src/models/H5PUser';
import { createH5PEditor } from '../src/createH5PServer';
import { machineIdSync } from 'node-machine-id';
import * as qs from 'qs';
import fetch from 'node-fetch';
import fsExtra from 'fs-extra';
import * as tar from 'tar';
import { extractArchive } from '../src/utils';
import path from 'path';
import { exec } from 'child_process';
import { assertValue } from '../../common/src/utils';

const SERVER_ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(SERVER_ROOT, 'out');
const ARCHIVE_FILE =
  process.argv[2] === undefined
    ? path.resolve(OUT, Config.h5pServerArchiveName)
    : path.resolve(process.argv[2]);
const TEMP_FOLDER = path.resolve(os.tmpdir(), 'h5p_builder');
const NODE_MODULES = path.resolve(SERVER_ROOT, 'node_modules');
const CONFIG = new H5P.H5PConfig(undefined, Config.h5pConfig);
const H5P_EDITOR = createH5PEditor(
  CONFIG,
  `${TEMP_FOLDER}/libraries`,
  new Config(TEMP_FOLDER, '', ''),
  `${TEMP_FOLDER}/temporary-storage`,
  `${TEMP_FOLDER}/user-data`,
  undefined,
  undefined,
  undefined,
);
const CKEDITOR_ROOT = path.resolve(TEMP_FOLDER, 'editor', 'ckeditor');
const CKEDITOR_PLUGINS = path.resolve(CKEDITOR_ROOT, 'plugins');

const REGISTRATION_DATA = {
  core_api_version: `${CONFIG.coreApiVersion.major}.${CONFIG.coreApiVersion.minor}`,
  disabled: CONFIG.fetchingDisabled,
  h5p_version: CONFIG.h5pVersion,
  local_id: machineIdSync(),
  platform_name: CONFIG.platformName,
  platform_version: CONFIG.platformVersion,
  type: CONFIG.siteType,
  uuid: CONFIG.uuid,
};

const USER = new User();

function sh(cmd: string) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ error, stdout, stderr });
      }
    });
  });
}

async function downloadH5PLibs() {
  console.log('Updating H5P libraries...');
  const response = await fetch(CONFIG.hubContentTypesEndpoint, {
    method: 'POST',
    body: qs.stringify(REGISTRATION_DATA),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const data = (await response.json()).contentTypes;
  const librariesPath = `${TEMP_FOLDER}/libraries`;
  fsExtra.ensureDirSync(librariesPath);
  const existingLibraries = await Promise.all(
    fsExtra
      .readdirSync(librariesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map(async (dirent) => ({
        name: dirent.name,
        ...(await fsExtra.readJSON(
          `${librariesPath}/${dirent.name}/library.json`,
        )),
      })),
  );
  const toInstall = Object.keys(Config.supportedLibraries).filter(
    (libraryName) => {
      const lib = data.find((item: any) => item.id === libraryName);
      if (lib == null) {
        throw new Error(`Could not find "${libraryName}"`);
      }
      // Are there any existing libraries with the exact version?
      return !existingLibraries.some(
        (existingLib: any) =>
          assertValue<string>(existingLib.name).startsWith(libraryName) &&
          existingLib.majorVersion === lib.version.major &&
          existingLib.minorVersion === lib.version.minor &&
          existingLib.patchVersion === lib.version.patch,
      );
    },
  );
  if (toInstall.length === 0) {
    console.log('Libraries already up-to-date.');
    return;
  }
  for (const libraryName of toInstall) {
    for (let tries = 3; tries--; tries > 0) {
      try {
        console.log(`Installing ${libraryName}`);
        await H5P_EDITOR.installLibraryFromHub(libraryName, USER);
        break;
      } catch (e) {
        if (tries === 0) {
          console.error(e);
          throw new Error(`Could not install "${libraryName}".`);
        } else {
          const hi = 5000;
          const lo = 1000;
          const waitTime = Math.round(Math.random() * (hi - lo) + lo);
          console.error(
            `Could not install "${libraryName}". Retrying in ${
              waitTime / 1000
            }s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
  }
}

async function includePatchedMathtype() {
  const mathTypePlugin = `${CKEDITOR_PLUGINS}/ckeditor_wiris`;
  const patchFile = `${__dirname}/mathtype-plugin-js.patch`;

  console.log('Patching and including ckeditor_wiris plugin...');
  fsExtra.ensureDirSync(CKEDITOR_PLUGINS);
  fsExtra.copySync(
    `${NODE_MODULES}/@wiris/mathtype-ckeditor4/`,
    mathTypePlugin,
  );
  await sh(`patch "${mathTypePlugin}/plugin.js" "${patchFile}"`);
}

function getCKEditorPluginPaths() {
  const submodulesRoot = path.resolve(SERVER_ROOT, 'ckeditor-plugins');
  const ckEditorRepoPlugins = path.resolve(
    submodulesRoot,
    'ckeditor4',
    'plugins',
  );
  const pluginPaths = [
    'blockquote',
    'image',
    'sourcearea',
    'indent',
    'indentblock',
    'indentlist',
    'iframe',
  ].map((plugin) => ({
    src: path.resolve(ckEditorRepoPlugins, plugin),
    dst: path.resolve(CKEDITOR_PLUGINS, plugin),
  }));
  pluginPaths.push({
    src: path.resolve(submodulesRoot, 'codetag'),
    dst: path.resolve(CKEDITOR_PLUGINS, 'codetag'),
  });
  pluginPaths.push({
    src: path.resolve(submodulesRoot, 'insertpre'),
    dst: path.resolve(CKEDITOR_PLUGINS, 'insertpre'),
  });
  pluginPaths.push({
    src: path.resolve(submodulesRoot, 'h5pimageupload'),
    dst: path.resolve(CKEDITOR_PLUGINS, 'h5pimageupload'),
  });
  pluginPaths.push(
    ...['editor.css', 'icons.png', 'icons_hidpi.png'].map((file) => ({
      src: path.resolve(
        submodulesRoot,
        'BootstrapCK4-Skin',
        'skins',
        'bootstrapck',
        file,
      ),
      dst: path.resolve(CKEDITOR_ROOT, 'skins', 'bootstrapck', file),
    })),
  );
  return pluginPaths;
}

async function copyExtras() {
  const extras: Array<{ src: string; dst: string }> = [
    {
      src: path.resolve(
        NODE_MODULES,
        '@lumieducation',
        'h5p-server',
        'build',
        'src',
        'schemas',
      ),
      dst: path.resolve(OUT, 'schemas'),
    },
    {
      src: path.resolve(SERVER_ROOT, 'static'),
      dst: path.resolve(OUT, 'static'),
    },
    ...getCKEditorPluginPaths(),
  ];
  await Promise.all(
    extras.map(async ({ src, dst }) => {
      console.log(`Copying to output: "${path.relative(SERVER_ROOT, src)}"`);
      await fsExtra.copy(src, dst);
    }),
  );
}

async function createArchive(archiveFile: string, wd: string, files: string[]) {
  const initialDir = process.cwd();
  process.chdir(wd);
  fsExtra.ensureDirSync(path.dirname(archiveFile));
  // Chdir into wd so the archived file paths are relative to that location
  await tar.c(
    {
      gzip: true,
      file: archiveFile,
    },
    files,
  );
  process.chdir(initialDir);
}

async function main() {
  // Extract archive if it exists
  if (fsExtra.pathExistsSync(ARCHIVE_FILE)) {
    await extractArchive(ARCHIVE_FILE, TEMP_FOLDER, false, undefined, {
      strip: 0,
    });
  }
  // Modify its contents
  await Promise.all([
    process.env['CI_TEST'] === undefined
      ? downloadH5PLibs()
      : Promise.resolve(),
    copyExtras(),
    includePatchedMathtype(),
  ]);
  // Recreate it
  await createArchive(ARCHIVE_FILE, TEMP_FOLDER, ['libraries', 'editor']);
}

main()
  .catch((err) => {
    throw err;
  })
  .finally(() => {
    console.log('Cleaning up temporary directory...');
    fsExtra.rmSync(TEMP_FOLDER, { recursive: true, force: true });
  });
