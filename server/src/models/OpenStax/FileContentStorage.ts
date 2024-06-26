import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config, { SupportedLibrary } from './config';
import { assertTrue, assertValue } from '../../../../common/src/utils';
import {
  CanonicalMetadata,
  NetworkMetadata,
} from '../../../../common/src/types';
import { walkJSON, iterHTML } from './ContentMutators';
import { Readable } from 'stream';
import { H5pError } from '@lumieducation/h5p-server';
import { recursiveMerge, setNamespaces } from '../../utils';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';
const IMG_DIR = 'media';

// Temp paths are constructed by addDirectoryByMimetype in h5p-server/src/H5PEditor.ts
// temporaryFileStorage.getFileStream wants paths relative to temp directory
// See getTemporaryFile in h5p-server/src/H5PAjaxEndpoint.ts for more information
// Example: http://.../h5p/temp-files/images/image-EJusOvWn.png#tmp -> images/image-EJusOvWn.png
function toTempName(pathname: string) {
  const tempPath = '/temp-files/';
  const tempPathIdx = pathname.indexOf(tempPath);
  assertTrue(tempPathIdx !== -1, 'Could not find temporary directory in url.');
  return pathname.slice(tempPathIdx + tempPath.length);
}

function getImageAttachments(images: Element[]) {
  return images
    .map((img) => img.getAttribute('src')?.trim())
    .filter((src): src is string => src != null && src !== '')
    .filter((src) => !src.startsWith('http'));
}

function updateAttachments(content: unknown, pathPrefix: string) {
  const replaced: Array<{ tmpName: string; newName: string }> = [];
  const attachments: string[] = [];
  iterHTML(content, ({ document }) => {
    const images = document.xpath<Element>('//h:img[@src]');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (src?.endsWith('#tmp') === true) {
        const name = img.getAttribute('data-filename')?.trim();
        const tmpName = toTempName(src.slice(0, -4));
        const newName = `${pathPrefix}/${name}`; // Our prefix can be anything
        assertTrue(name !== '' && name != null, 'BUG: data-filename not found');
        if (replaced.findIndex((obj) => obj.newName === newName) === -1) {
          replaced.push({ tmpName, newName });
        }
        img.removeAttribute('data-filename');
        img.setAttribute('src', newName);
      }
    });
    attachments.push(...getImageAttachments(images));
  });
  return { replaced, attachments };
}

export function fixNamespaces(content: unknown) {
  iterHTML(content, ({ document }) => {
    // Get all math tags in xhtml namespace (i.e. math without xmlns set)
    const xhtmlMath = document.xpath<Element>('//h:math');
    xhtmlMath.forEach((m) => {
      // Re-parse the math element with new namespaces
      const newMath = setNamespaces(m, {
        '': 'http://www.w3.org/1998/Math/MathML',
      });
      const parent = assertValue(m.parentNode, 'Expected parent node');
      // Replace original with new one
      parent.replaceChild(newMath, m);
    });
  });
}

function validateContent(content: unknown) {
  const tmpPathPattern = /src="[^"]+?#tmp"/;
  walkJSON(content, (field) => {
    if (typeof field.value === 'string') {
      assertTrue(
        !tmpPathPattern.test(field.value),
        `ERROR: Found unexpected temp path in ${field.fqPath.join('.')}`,
      );
    }
  });
}

function mergeMetadata(
  existingMetadata: Partial<CanonicalMetadata>,
  newMetadata: NetworkMetadata,
): CanonicalMetadata {
  // Remove nickname and any optional fields that do not have a value
  return Object.fromEntries(
    Object.entries({
      ...existingMetadata,
      ...newMetadata,
    }).filter(([k, v]) => k !== 'nickname' && v !== null),
  ) as unknown as CanonicalMetadata;
}

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  private readonly privateContentDirectory: string;
  private readonly temporaryFileStorage: H5P.ITemporaryFileStorage;

  constructor(config: Config, temporaryFileStorage: H5P.ITemporaryFileStorage) {
    super(config.contentDirectory);
    this.privateContentDirectory = config.privateContentDirectory;
    this.temporaryFileStorage = temporaryFileStorage;
  }

  protected assertLibrary(mainLibrary: string): SupportedLibrary {
    /* istanbul ignore next */
    return assertValue(
      Config.supportedLibraries[mainLibrary],
      `Cannot handle private answers for type "${mainLibrary}"`,
    );
  }

  protected async writeJSON(
    id: string,
    filename: string,
    content: unknown,
    isPrivate: boolean,
  ) {
    await this._addFile(
      id,
      filename,
      JSON.stringify(content, null, 2),
      isPrivate,
    );
  }

  private async _addFile(
    id: string,
    filename: string,
    content: Readable | string,
    isPrivate: boolean,
  ) {
    const dst = path.join(
      isPrivate ? this.privateContentDirectory : this.contentPath,
      id,
      filename,
    );
    await fsExtra.ensureDir(path.dirname(dst));
    if (typeof content === 'string') {
      await fsExtra.writeFile(dst, content);
    } else {
      await new Promise((resolve, reject) =>
        content
          .pipe(fsExtra.createWriteStream(dst, { encoding: 'utf-8' }))
          .on('error', reject)
          .on('finish', resolve),
      );
    }
  }

  protected async moveTempFiles(
    replacedImages: Array<{ tmpName: string; newName: string }>,
    id: string,
    user: H5P.IUser,
    isPrivate: boolean,
  ) {
    await Promise.all(
      replacedImages.map(async ({ tmpName, newName }) => {
        const stream = await this.temporaryFileStorage.getFileStream(
          tmpName,
          user,
        );
        await this._addFile(id, newName, stream, isPrivate);
      }),
    );
  }

  private async _handleAttachmentsInContent(
    id: string,
    content: unknown,
    user: H5P.IUser,
    isPrivate: boolean,
  ) {
    const { replaced, attachments } = updateAttachments(content, IMG_DIR);
    validateContent(content);
    await this.moveTempFiles(replaced, id, user, isPrivate);
    await Promise.all(
      attachments.map(async (item) => {
        const paths = await this._findFilePaths(id, item);
        // if its location does not match its visibility, copy it
        const [missing, loc] = isPrivate
          ? [paths.private === undefined, paths.public]
          : [paths.public === undefined, paths.private];
        if (missing) {
          const src = assertValue(loc, `Could not find attachment: ${item}`);
          await this._addFile(
            id,
            item,
            fsExtra.createReadStream(src),
            isPrivate,
          );
        }
      }),
    );
    return attachments;
  }

  public override async addContent(
    metadata: H5P.IContentMetadata,
    content: any,
    user: H5P.IUser,
    id?: string | undefined,
  ): Promise<string> {
    const osMeta: NetworkMetadata = content.osMeta;
    const realId =
      id ??
      assertValue<string>(
        osMeta.nickname?.trim(),
        'Missing value for nickname',
      );
    delete content.osMeta;
    if (realId !== id) {
      assertTrue(!(await this.contentExists(realId)), `Duplicate id ${realId}`);
    }
    // Content id of 0 causes the player to break
    assertTrue(realId !== '0', 'Content id cannot be 0');
    const newOsMeta = mergeMetadata(await this.getOSMeta(realId), osMeta);
    const oldAttachments = newOsMeta.attachments ?? [];
    const privateAttachments: string[] = [];
    const publicAttachments: string[] = [];
    const library = this.assertLibrary(metadata.mainLibrary);
    fixNamespaces(content);
    if (!library.isSolutionPublic(content)) {
      const [sanitized, privateData] = library.yankAnswers(content);
      // Replace images in private content
      privateAttachments.push(
        ...(await this._handleAttachmentsInContent(
          realId,
          privateData,
          user,
          true,
        )),
      );
      // write private data to private content.json file
      await this.writeJSON(realId, CONTENT_NAME, privateData, true);

      publicAttachments.push(
        ...(await this._handleAttachmentsInContent(
          realId,
          sanitized,
          user,
          false,
        )),
      );
      // write sanitized content object to content.json file
      await this.writeJSON(realId, CONTENT_NAME, sanitized, false);
    } else {
      publicAttachments.push(
        ...(await this._handleAttachmentsInContent(
          realId,
          content,
          user,
          false,
        )),
      );
      await this.writeJSON(realId, CONTENT_NAME, content, false);
      await this.deletePrivateContent(realId);
    }

    // Add attachments from metadata
    publicAttachments.push(
      ...(await this._handleAttachmentsInContent(
        realId,
        newOsMeta,
        user,
        false,
      )),
    );

    for (const name of oldAttachments) {
      const paths = await this._findFilePaths(realId, name);
      if (paths.private !== undefined && !privateAttachments.includes(name)) {
        fsExtra.rmSync(paths.private);
      }
      if (paths.public !== undefined && !publicAttachments.includes(name)) {
        fsExtra.rmSync(paths.public);
      }
    }

    newOsMeta.attachments = Array.from(
      new Set(publicAttachments.concat(privateAttachments)),
    );

    await Promise.all([
      this.writeJSON(realId, H5P_NAME, metadata, false),
      this.writeJSON(realId, METADATA_NAME, newOsMeta, false),
    ]);
    return realId;
  }

  protected async deletePrivateContent(contentId: string) {
    const privatePath = path.join(this.privateContentDirectory, contentId);
    await fsExtra.rm(privatePath, { recursive: true, force: true });
  }

  public override async deleteContent(contentId: string, user?: H5P.IUser) {
    await Promise.all([
      super.deleteContent(contentId, user),
      this.deletePrivateContent(contentId),
    ]);
  }

  public override async getMetadata(
    contentId: string,
    user?: H5P.IUser,
  ): Promise<H5P.IContentMetadata> {
    const metadata = await super.getMetadata(contentId, user);
    if ((typeof metadata.title as unknown) !== 'string') {
      metadata.title = String(metadata.title);
    }
    /* istanbul ignore if (should not happen) */
    if ((typeof metadata.mainLibrary as unknown) !== 'string') {
      metadata.mainLibrary = String(metadata.mainLibrary);
    }
    return metadata;
  }

  private async mergeLoad(contentId: string, filename: string) {
    let merged: Record<string, any> = {};
    const filePaths = await this._findFilePaths(contentId, filename);
    const loadOrder = [filePaths.public, filePaths.private];
    for (const p of loadOrder) {
      if (p !== undefined) {
        const content = await fsExtra.readJSON(p);
        merged = recursiveMerge(merged, content) as Record<string, any>;
      }
    }
    return merged;
  }

  public async getOSMeta(
    contentId: string,
  ): Promise<Partial<CanonicalMetadata>> {
    return await this.mergeLoad(contentId, METADATA_NAME);
  }

  public override async getParameters(contentId: string): Promise<any> {
    return await this.mergeLoad(contentId, CONTENT_NAME);
  }

  private async _findFilePaths(id: string, filename: string) {
    const pathTuples: [string, string][] = [
      ['public', path.join(this.contentPath, id, filename)],
      ['private', path.join(this.privateContentDirectory, id, filename)],
    ];
    const paths: Partial<Record<'public' | 'private', string>> =
      Object.fromEntries(pathTuples.filter((t) => fsExtra.existsSync(t[1])));
    return paths;
  }

  private async _findFilePath(id: string, filename: string) {
    const paths = await this._findFilePaths(id, filename);
    return paths.public ?? paths.private;
  }

  public override async getFileStats(
    id: string,
    filename: string,
  ): Promise<H5P.IFileStats> {
    const realPath = await this._findFilePath(id, filename);
    if (realPath === undefined) {
      throw new H5pError(
        'content-file-missing',
        { filename, contentId: id },
        404,
      );
    }
    return await fsExtra.stat(realPath);
  }

  /* istanbul ignore next (mock-fs does not support streams) */
  public override async getFileStream(
    id: string,
    filename: string,
    _user: H5P.IUser,
    rangeStart?: number | undefined,
    rangeEnd?: number | undefined,
  ): Promise<fsExtra.ReadStream> {
    const realPath = await this._findFilePath(id, filename);
    if (realPath === undefined) {
      throw new H5pError(
        'content-file-missing',
        { filename, contentId: id },
        404,
      );
    }
    return fsExtra.createReadStream(realPath, {
      start: rangeStart,
      end: rangeEnd,
    });
  }
}
