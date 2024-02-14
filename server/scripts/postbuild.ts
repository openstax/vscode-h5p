import os from 'os';
import * as H5P from '@lumieducation/h5p-server';
import User from '../src/models/H5PUser';
import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { assertTrue, assertValue } from '../../common/src/utils';
import Config from '../src/models/OpenStax/config';
import { extractArchive } from '../src/utils';
import { execSync } from 'child_process';
import qs from 'qs';
import * as tar from 'tar';
import { createH5PEditor } from '../src/createH5PServer';

interface CopyDefinition {
  src: string[];
  dst: string[];
}

interface PatchOptions {
  outputFile?: string;
}

interface PatchDefinition {
  patchFile: string[];
  inputFile: string[];
  options?: PatchOptions;
}

interface WriteDefinition {
  dst: string[];
  content: string | Buffer;
}

interface CopyOperation {
  src: string;
  dst: string;
}

interface PatchOperation {
  patchFile: string;
  inputFile: string;
  options?: PatchOptions;
}

interface WriteOperation {
  dst: string;
  content: string | Buffer;
}

interface Context {
  copyOperations: CopyOperation[];
  patchOperations: PatchOperation[];
  writeOperations: WriteOperation[];
}

const TEMP_FOLDER = path.resolve(os.tmpdir(), 'h5p_builder');
const SERVER_ROOT = path.resolve(__dirname, '..');
const NODE_MODULES = path.resolve(SERVER_ROOT, 'node_modules');
const DST_OUT = path.resolve(SERVER_ROOT, 'out');
const SRC_H5P_ROOT = path.resolve(SERVER_ROOT, 'h5p-php');
const ARCHIVE_FILE = path.resolve(DST_OUT, Config.h5pServerArchiveName);

const MISC_COPIES = [
  {
    src: [
      NODE_MODULES,
      '@lumieducation',
      'h5p-server',
      'build',
      'src',
      'schemas',
    ],
    dst: [DST_OUT, 'schemas'],
  },
  {
    src: [SERVER_ROOT, 'static'],
    dst: [DST_OUT, 'static'],
  },
];

const SRC_H5P_EDITOR_ROOT = path.resolve(
  SRC_H5P_ROOT,
  'h5p-editor-php-library',
);
const DST_H5P_EDITOR_NAME = 'editor';
const DST_H5P_EDITOR_ROOT = path.resolve(TEMP_FOLDER, DST_H5P_EDITOR_NAME);
const H5P_EDITOR_COPIES = [
  {
    src: [SRC_H5P_EDITOR_ROOT, 'README.md'],
    dst: [DST_H5P_EDITOR_ROOT, 'README.md'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'ckeditor'],
    dst: [DST_H5P_EDITOR_ROOT, 'ckeditor'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'composer.json'],
    dst: [DST_H5P_EDITOR_ROOT, 'composer.json'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'h5peditor-ajax.class.php'],
    dst: [DST_H5P_EDITOR_ROOT, 'h5peditor-ajax.class.php'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'h5peditor-ajax.interface.php'],
    dst: [DST_H5P_EDITOR_ROOT, 'h5peditor-ajax.interface.php'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'h5peditor-file.class.php'],
    dst: [DST_H5P_EDITOR_ROOT, 'h5peditor-file.class.php'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'h5peditor-storage.interface.php'],
    dst: [DST_H5P_EDITOR_ROOT, 'h5peditor-storage.interface.php'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'h5peditor.class.php'],
    dst: [DST_H5P_EDITOR_ROOT, 'h5peditor.class.php'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'images'],
    dst: [DST_H5P_EDITOR_ROOT, 'images'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'language'],
    dst: [DST_H5P_EDITOR_ROOT, 'language'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'libs'],
    dst: [DST_H5P_EDITOR_ROOT, 'libs'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'scripts'],
    dst: [DST_H5P_EDITOR_ROOT, 'scripts'],
  },
  {
    src: [SRC_H5P_EDITOR_ROOT, 'styles'],
    dst: [DST_H5P_EDITOR_ROOT, 'styles'],
  },
];

const SRC_H5P_PHP_ROOT = path.resolve(SRC_H5P_ROOT, 'h5p-php-library');
const DST_H5P_PHP_NAME = 'core';
const DST_H5P_PHP_ROOT = path.resolve(TEMP_FOLDER, DST_H5P_PHP_NAME);
const H5P_PHP_COPIES = [
  {
    src: [SRC_H5P_PHP_ROOT, 'LICENSE.txt'],
    dst: [DST_H5P_PHP_ROOT, 'LICENSE.txt'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'README.txt'],
    dst: [DST_H5P_PHP_ROOT, 'README.txt'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'composer.json'],
    dst: [DST_H5P_PHP_ROOT, 'composer.json'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'doc'],
    dst: [DST_H5P_PHP_ROOT, 'doc'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'embed.php'],
    dst: [DST_H5P_PHP_ROOT, 'embed.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'fonts'],
    dst: [DST_H5P_PHP_ROOT, 'fonts'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p-default-storage.class.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p-default-storage.class.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p-development.class.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p-development.class.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p-event-base.class.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p-event-base.class.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p-file-storage.interface.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p-file-storage.interface.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p-metadata.class.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p-metadata.class.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'h5p.classes.php'],
    dst: [DST_H5P_PHP_ROOT, 'h5p.classes.php'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'images'],
    dst: [DST_H5P_PHP_ROOT, 'images'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'js'],
    dst: [DST_H5P_PHP_ROOT, 'js'],
  },
  {
    src: [SRC_H5P_PHP_ROOT, 'styles'],
    dst: [DST_H5P_PHP_ROOT, 'styles'],
  },
];

const DST_CKEDITOR_ROOT = path.resolve(DST_H5P_EDITOR_ROOT, 'ckeditor');
const DST_CKEDITOR_PLUGINS = path.resolve(DST_CKEDITOR_ROOT, 'plugins');
const DST_MATHTYPE_PLUGIN = path.resolve(
  DST_CKEDITOR_PLUGINS,
  'ckeditor_wiris',
);
const SRC_CKEDITOR_PLUGINS = path.resolve(SERVER_ROOT, 'ckeditor-plugins');
const SRC_CKEDITOR_BUNDLED_PLUGINS = path.resolve(
  SRC_CKEDITOR_PLUGINS,
  'ckeditor4',
  'plugins',
);
const SRC_BOOTSTRAP_SKIN = path.resolve(
  SRC_CKEDITOR_PLUGINS,
  'BootstrapCK4-Skin',
  'skins',
  'bootstrapck',
);
const DST_BOOTSTRAP_SKIN = path.resolve(
  DST_CKEDITOR_ROOT,
  'skins',
  'bootstrapck',
);
const CKEDITOR_PLUGIN_COPIES: CopyDefinition[] = [
  {
    src: [NODE_MODULES, '@wiris', 'mathtype-ckeditor4'],
    dst: [DST_MATHTYPE_PLUGIN],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'blockquote'],
    dst: [DST_CKEDITOR_PLUGINS, 'blockquote'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'image'],
    dst: [DST_CKEDITOR_PLUGINS, 'image'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'sourcearea'],
    dst: [DST_CKEDITOR_PLUGINS, 'sourcearea'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'indent'],
    dst: [DST_CKEDITOR_PLUGINS, 'indent'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'indentblock'],
    dst: [DST_CKEDITOR_PLUGINS, 'indentblock'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'indentlist'],
    dst: [DST_CKEDITOR_PLUGINS, 'indentlist'],
  },
  {
    src: [SRC_CKEDITOR_BUNDLED_PLUGINS, 'iframe'],
    dst: [DST_CKEDITOR_PLUGINS, 'iframe'],
  },
  {
    src: [SRC_CKEDITOR_PLUGINS, 'codetag'],
    dst: [DST_CKEDITOR_PLUGINS, 'codetag'],
  },
  {
    src: [SRC_CKEDITOR_PLUGINS, 'insertpre'],
    dst: [DST_CKEDITOR_PLUGINS, 'insertpre'],
  },
  {
    src: [SRC_CKEDITOR_PLUGINS, 'h5pimageupload'],
    dst: [DST_CKEDITOR_PLUGINS, 'h5pimageupload'],
  },
  {
    src: [SRC_BOOTSTRAP_SKIN, 'editor.css'],
    dst: [DST_BOOTSTRAP_SKIN, 'editor.css'],
  },
  {
    src: [SRC_BOOTSTRAP_SKIN, 'icons.png'],
    dst: [DST_BOOTSTRAP_SKIN, 'icons.png'],
  },
  {
    src: [SRC_BOOTSTRAP_SKIN, 'icons_hidpi.png'],
    dst: [DST_BOOTSTRAP_SKIN, 'icons_hidpi.png'],
  },
];

const TO_COPY: CopyDefinition[] = [
  ...H5P_EDITOR_COPIES,
  ...H5P_PHP_COPIES,
  ...MISC_COPIES,
  ...CKEDITOR_PLUGIN_COPIES,
];

const TO_PATCH: PatchDefinition[] = [
  {
    patchFile: [__dirname, 'mathtype-plugin-js.patch'],
    inputFile: [DST_MATHTYPE_PLUGIN, 'plugin.js'],
  },
  {
    patchFile: [__dirname, 'enable-h5p-validation.patch'],
    inputFile: [
      DST_H5P_EDITOR_ROOT,
      'scripts',
      'h5peditor-library-selector.js',
    ],
  },
];

const TO_WRITE: WriteDefinition[] = [
  {
    dst: [TEMP_FOLDER, 'config.json'],
    content: JSON.stringify(Config.h5pConfig),
  },
];

const IS_CI_TEST = process.env['CI_TEST'] !== undefined;
// Paths that should be included in the archive (relative to TEMP_FOLDER)
const ARCHIVE_PATHS = [
  DST_H5P_PHP_NAME,
  DST_H5P_EDITOR_NAME,
  Config.configName,
  ...(IS_CI_TEST ? [] : [Config.librariesName]),
];

function preFlight(context: Context) {
  const directories = new Set<string>();
  const handlePath = (src: string, dst: string) => {
    try {
      const stats = fs.statSync(src);
      if (stats.isFile()) {
        directories.add(path.dirname(dst));
      } else if (stats.isDirectory()) {
        directories.add(dst);
      } else {
        throw new Error(`"${src}" is not a file or directory.`);
      }
    } catch (e) {
      throw fs.existsSync(src)
        ? e
        : new Error(
            `Missing: "${src}" (check sources and maybe run npm install)`,
          );
    }
  };
  console.log('Checking src files...');
  context.copyOperations.forEach(({ src, dst }) => handlePath(src, dst));
  console.log('Checking patch files...');
  context.patchOperations.forEach(({ patchFile, inputFile, options }) =>
    handlePath(patchFile, options?.outputFile ?? inputFile),
  );
  Array.from(directories).forEach((d) => fs.ensureDirSync(d));
}

function cleanPath(p: string) {
  switch (true) {
    case p.includes(SERVER_ROOT):
      return path.relative(SERVER_ROOT, p);
    case p.includes(TEMP_FOLDER):
      return path.relative(TEMP_FOLDER, p);
    default:
      return p;
  }
}

function sh256hash(content: Buffer) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getFileHash(filePath: string) {
  const content = fs.readFileSync(filePath);
  return sh256hash(content);
}

function getFileHashes(fileOrDirectory: string): Set<string> {
  const fileHashes = new Set<string>();

  function walkDirectory(wd: string): void {
    const entries = fs.readdirSync(wd, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.resolve(wd, entry.name);

      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else if (entry.isFile()) {
        const hash = getFileHash(fullPath);
        fileHashes.add(
          `${path.relative(fileOrDirectory, fullPath).toLowerCase()}|${hash}`,
        );
      }
    });
  }

  if (fs.statSync(fileOrDirectory).isDirectory()) {
    walkDirectory(fileOrDirectory);
  } else {
    const hash = getFileHash(fileOrDirectory);
    fileHashes.add(`${path.basename(fileOrDirectory).toLowerCase()}|${hash}`);
  }
  return fileHashes;
}

function sh(cmd: string) {
  try {
    return execSync(cmd)?.toString('utf-8');
  } catch (e) {
    const err = e as { stderr?: Buffer; status: number };
    throw new Error(`Exit ${err.status}: ${err.stderr?.toString('utf-8')}`);
  }
}

function patch(
  inputFile: string,
  patchFile: string,
  options?: PatchOptions,
): void {
  const args = [];
  if (options?.outputFile !== undefined) {
    args.push(`-o "${options.outputFile}"`);
  }
  args.push(`"${inputFile}"`);
  args.push(`"${patchFile}"`);
  sh(`patch ${args.join(' ')}`);
}

function doCopies(copies: CopyOperation[]) {
  const verify = (src: string, dst: string) => {
    const srcHashes = getFileHashes(src);
    const dstHashes = getFileHashes(dst);

    srcHashes.forEach((hash) => {
      assertTrue(dstHashes.has(hash), `Integrity error: ${hash}`);
    });
  };
  for (const { src, dst } of copies) {
    console.log(`Copying "${cleanPath(src)}" -> "${cleanPath(dst)}"`);
    fs.copySync(src, dst);
    verify(src, dst);
  }
}

function doWrites(writes: WriteOperation[]) {
  writes.forEach(({ dst, content }) => {
    console.log(`Writing "${cleanPath(dst)}"...`);
    fs.writeFileSync(dst, content);
    assertTrue(
      fs.existsSync(dst) &&
        getFileHash(dst) === sh256hash(Buffer.from(content)),
      `Integrity error: writing to "${dst}" failed`,
    );
  });
}

function doPatches(patches: PatchOperation[]) {
  patches.forEach(({ patchFile, inputFile, options }) => {
    console.log(
      `Patching "${cleanPath(inputFile)}" -> "${cleanPath(
        options?.outputFile ?? inputFile,
      )}"...`,
    );
    patch(inputFile, patchFile, options);
  });
}

async function tryInstallLibrary(
  libraryName: string,
  h5pEditor: H5P.H5PEditor,
  user: H5P.IUser,
  tries: number,
) {
  try {
    console.log(`Installing ${libraryName}`);
    await h5pEditor.installLibraryFromHub(libraryName, user);
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
      await tryInstallLibrary(libraryName, h5pEditor, user, tries - 1);
    }
  }
}

async function downloadH5PLibs() {
  const user = new User();
  const config = new H5P.H5PConfig(undefined, Config.h5pConfig);
  const h5pEditor = createH5PEditor(
    config,
    path.resolve(TEMP_FOLDER, 'libraries'),
    new Config(TEMP_FOLDER, '', ''),
    path.resolve(TEMP_FOLDER, 'temporary-storage'),
    path.resolve(TEMP_FOLDER, 'user-data'),
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
  const response = await fetch(config.hubContentTypesEndpoint, {
    method: 'POST',
    body: qs.stringify(registrationData),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const tryParseJSONResponse = async (response: Response) => {
    try {
      return await response.json();
    } catch (e) {
      console.error(e);
      throw new Error('Failed to parse JSON response');
    }
  };
  const manifest = (await tryParseJSONResponse(response)).contentTypes;
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
    await tryInstallLibrary(libraryName, h5pEditor, user, 3);
  }
}

async function createArchive(archiveFile: string, wd: string, paths: string[]) {
  const initialDir = process.cwd();
  process.chdir(wd);
  try {
    paths.forEach((p) =>
      assertTrue(fs.existsSync(p), `Missing archive content: "${p}"`),
    );
    fs.ensureDirSync(path.dirname(archiveFile));
    // Chdir into wd so the archived file paths are relative to that location
    await tar.c(
      {
        gzip: true,
        file: archiveFile,
      },
      paths,
    );
  } finally {
    process.chdir(initialDir);
  }
}

async function main() {
  const context: Context = {
    copyOperations: TO_COPY.map((obj) => ({
      ...obj,
      src: path.resolve(...obj.src),
      dst: path.resolve(...obj.dst),
    })),
    patchOperations: TO_PATCH.map((obj) => ({
      ...obj,
      patchFile: path.resolve(...obj.patchFile),
      inputFile: path.resolve(...obj.inputFile),
    })),
    writeOperations: TO_WRITE.map((obj) => ({
      ...obj,
      dst: path.resolve(...obj.dst),
    })),
  };
  console.log('Doing pre-flight...');
  preFlight(context);
  if (fs.pathExistsSync(ARCHIVE_FILE)) {
    await extractArchive(ARCHIVE_FILE, TEMP_FOLDER, { verbose: false });
  }
  if (!IS_CI_TEST) {
    console.log('Updating H5P libraries...');
    await downloadH5PLibs();
  }
  console.log('Copying files...');
  doCopies(context.copyOperations);
  console.log('Writing files...');
  doWrites(context.writeOperations);
  console.log('Patching files...');
  doPatches(context.patchOperations);
  console.log('Creating archive...');
  await createArchive(ARCHIVE_FILE, TEMP_FOLDER, ARCHIVE_PATHS);
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
