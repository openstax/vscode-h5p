import os from 'os';
import * as H5P from '@lumieducation/h5p-server';
import Config from '../src/models/OpenStax/config';
import User from '../src/models/H5PUser';
import { createH5PEditor } from '../src/createH5PServer';
import { machineIdSync } from 'node-machine-id';
import * as qs from 'qs';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import * as tar from 'tar';
import { extractArchive } from '../src/utils';
import path from 'path';
import { execSync } from 'child_process';
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
  path.resolve(TEMP_FOLDER, 'libraries'),
  new Config(TEMP_FOLDER, '', ''),
  path.resolve(TEMP_FOLDER, 'temporary-storage'),
  path.resolve(TEMP_FOLDER, 'user-data'),
  undefined,
  undefined,
  undefined,
);
const H5P_EDITOR_PREFIX = 'editor';
const CKEDITOR_ROOT = path.resolve(TEMP_FOLDER, H5P_EDITOR_PREFIX, 'ckeditor');
const CKEDITOR_PLUGINS = path.resolve(CKEDITOR_ROOT, 'plugins');

// Directories that exist in the root of the h5p archive
const H5P_DIRECTORIES = [
  'libraries',
  'temporary-storage',
  'core',
  H5P_EDITOR_PREFIX,
  'user-data',
  'tmp',
];

// Paths that should be in the h5p archive
const H5P_PATHS = [...H5P_DIRECTORIES, 'config.json'];

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
  try {
    return execSync(cmd).toString('utf-8');
  } catch (e) {
    const err = e as { stderr: Buffer; status: number };
    throw new Error(`Exit ${err.status}: ${err.stderr.toString('utf-8')}`);
  }
}

async function tryInstallLibrary(libraryName: string, tries: number) {
  try {
    console.log(`Installing ${libraryName}`);
    await H5P_EDITOR.installLibraryFromHub(libraryName, USER);
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
      await tryInstallLibrary(libraryName, tries - 1);
    }
  }
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
  const manifest = (await response.json()).contentTypes;
  const librariesPath = path.resolve(TEMP_FOLDER, 'libraries');
  fs.ensureDirSync(librariesPath);
  const existingLibraries = await Promise.all(
    fs
      .readdirSync(librariesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map(async (dirent) => ({
        name: dirent.name,
        ...(await fs.readJSON(
          path.resolve(librariesPath, dirent.name, 'library.json'),
        )),
      })),
  );
  const toInstall = Object.keys(Config.supportedLibraries).filter(
    (libraryName) => {
      const lib = manifest.find((item: any) => item.id === libraryName);
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
    await tryInstallLibrary(libraryName, 3);
  }
}

function patch(
  inputFile: string,
  patchFile: string,
  options?: { outputFile?: string },
): void {
  const args = [];
  if (options?.outputFile !== undefined) {
    args.push(`-o "${options.outputFile}"`);
  }
  args.push(`"${inputFile}"`);
  args.push(`"${patchFile}"`);
  sh(`patch ${args.join(' ')}`);
}

function includePatchedMathtype() {
  const mathTypePlugin = path.resolve(CKEDITOR_PLUGINS, 'ckeditor_wiris');
  const patchFile = path.resolve(__dirname, 'mathtype-plugin-js.patch');

  console.log('Patching and including ckeditor_wiris plugin...');
  fs.ensureDirSync(CKEDITOR_PLUGINS);
  fs.copySync(
    path.resolve(NODE_MODULES, '@wiris', 'mathtype-ckeditor4'),
    mathTypePlugin,
  );
  patch(path.resolve(mathTypePlugin, 'plugin.js'), patchFile);
}

function patchH5PEditor() {
  const h5pEditor = path.resolve(TEMP_FOLDER, H5P_EDITOR_PREFIX);
  const patchFile = path.resolve(__dirname, 'enable-h5p-validation.patch');
  console.log('Patching h5p editor...');
  patch(
    path.resolve(h5pEditor, 'scripts', 'h5peditor-library-selector.js'),
    patchFile,
  );
}

function getMiscCopies() {
  return [
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
  ];
}

function getCKEditorPluginCopies() {
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

function getH5PCopies() {
  const h5pRoot = path.resolve(SERVER_ROOT, 'h5p-php');
  const getPaths = (srcPrefix: string, dstPrefix: string) => {
    return fs
      .readdirSync(path.resolve(h5pRoot, srcPrefix))
      .filter((name) => !name.startsWith('.'))
      .map((name) => ({
        src: path.resolve(h5pRoot, srcPrefix, name),
        dst: path.resolve(TEMP_FOLDER, dstPrefix, name),
      }));
  };
  const coreFiles = getPaths('h5p-php-library', 'core');
  const editorFiles = getPaths('h5p-editor-php-library', H5P_EDITOR_PREFIX);
  return coreFiles.concat(editorFiles);
}

function doCopies(copies: Array<{ src: string; dst: string }>) {
  for (const { src, dst } of copies) {
    const relSrc = path.relative(SERVER_ROOT, src);
    const relDst =
      dst.indexOf(TEMP_FOLDER) !== -1 ? path.relative(TEMP_FOLDER, dst) : dst;
    console.log(`Copying "${relSrc}" -> "${relDst}"`);
    fs.copySync(src, dst);
  }
}

async function createArchive(archiveFile: string, wd: string, files: string[]) {
  const initialDir = process.cwd();
  process.chdir(wd);
  fs.ensureDirSync(path.dirname(archiveFile));
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
  if (fs.pathExistsSync(ARCHIVE_FILE)) {
    await extractArchive(ARCHIVE_FILE, TEMP_FOLDER, { verbose: false });
  }
  const downloadTask =
    process.env['CI_TEST'] === undefined
      ? downloadH5PLibs()
      : Promise.resolve();
  H5P_DIRECTORIES.forEach((name) =>
    fs.ensureDirSync(path.resolve(TEMP_FOLDER, name)),
  );
  doCopies(getH5PCopies());
  doCopies(getMiscCopies());
  doCopies(getCKEditorPluginCopies());
  includePatchedMathtype();
  patchH5PEditor();
  fs.writeFileSync(
    path.resolve(TEMP_FOLDER, 'config.json'),
    JSON.stringify(Config.h5pConfig),
  );
  await downloadTask;
  // Recreate it
  await createArchive(ARCHIVE_FILE, TEMP_FOLDER, H5P_PATHS);
}

main()
  .catch((err) => {
    throw err;
  })
  .then(() => {
    console.log('Build successful!');
  })
  .finally(() => {
    console.log(`Cleaning up temporary directory... (${TEMP_FOLDER})`);
    fs.rmSync(TEMP_FOLDER, { recursive: true, force: true });
  });
