import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from './config';
import { assertTrue, assertValue } from '../../../../common/src/utils';
import {
  CanonicalMetadata,
  NetworkMetadata,
} from '../../../../common/src/types';
import { iterContent, iterHTML, parseAsHTML } from './ContentMutators';
import { Readable } from 'stream';
import { H5pError } from '@lumieducation/h5p-server';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';
const IMG_DIR = 'media';

function assertLibrary(mainLibrary: string) {
  const library = Config.supportedLibraries[mainLibrary];
  if (library != null) {
    return library;
  }
  throw new Error(`Cannot handle private answers for type "${mainLibrary}"`);
}

function yankAnswers(
  content: unknown,
  mainLibrary: string,
): [unknown, unknown] {
  return assertLibrary(mainLibrary).yankAnswers(content);
}

function unyankAnswers(
  publicData: unknown,
  privateData: unknown,
  mainLibrary: string,
): unknown {
  return assertLibrary(mainLibrary).unyankAnswers(publicData, privateData);
}

function isSolutionPublic(osMeta: { is_solution_public?: boolean }): boolean {
  return (osMeta.is_solution_public ?? false) === true;
}

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
    .filter((src): src is string => src != null && src !== '');
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
        replaced.push({ tmpName, newName });
        img.removeAttribute('data-filename');
        img.setAttribute('src', newName);
      }
    });
    attachments.push(...getImageAttachments(images));
  });
  return { replaced, attachments };
}

function validateContent(content: unknown) {
  const tmpPathPattern = /src="[^"]+?#tmp"/;
  iterContent(content, (field) => {
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
      // Always construct this array from scratch
      attachments: [],
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
      attachments.map(async (attachment) => {
        const location = assertValue(
          await this._findFilePath(id, attachment),
          `Could not find image: ${attachment}`,
        );
        const locationIsPrivate = location.includes(
          this.privateContentDirectory,
        );
        // if its location does not match its visibility
        if (isPrivate !== locationIsPrivate) {
          // copy it
          await this._addFile(
            id,
            attachment,
            fsExtra.createReadStream(location),
            isPrivate,
          );
          // remove the old one
          await fsExtra.rm(location);
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
    if (!isSolutionPublic(osMeta)) {
      const [sanitized, privateData] = yankAnswers(
        content,
        metadata.mainLibrary,
      );
      // Replace images in private content
      const privateAttachments = await this._handleAttachmentsInContent(
        realId,
        privateData,
        user,
        true,
      );
      await this.writeJSON(realId, CONTENT_NAME, privateData, true);

      // write sanitized content object to content.json file
      const publicAttachments = await this._handleAttachmentsInContent(
        realId,
        sanitized,
        user,
        false,
      );
      await this.writeJSON(realId, CONTENT_NAME, sanitized, false);
      newOsMeta.attachments.push(...publicAttachments);
      newOsMeta.attachments.push(...privateAttachments);
    } else {
      newOsMeta.attachments.push(
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

    // Add attachments from collaborator_solutions
    newOsMeta.collaborator_solutions.forEach((solution) => {
      const doc = parseAsHTML(solution.content);
      newOsMeta.attachments.push(
        ...getImageAttachments(doc.xpath<Element>('//h:img[@src]')),
      );
    });

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
      metadata.title = metadata.title.toString();
    }
    if ((typeof metadata.mainLibrary as unknown) !== 'string') {
      metadata.mainLibrary = metadata.mainLibrary.toString();
    }
    return metadata;
  }

  public async getOSMeta(
    contentId: string,
  ): Promise<Partial<CanonicalMetadata>> {
    const mdPath = path.join(this.contentPath, contentId, METADATA_NAME);
    return fsExtra.existsSync(mdPath) ? await fsExtra.readJSON(mdPath) : {};
  }

  public override async getParameters(
    contentId: string,
    user?: H5P.IUser | undefined,
  ): Promise<any> {
    const [content, osMeta] = await Promise.all([
      super.getParameters(contentId, user),
      this.getOSMeta(contentId),
    ]);
    if (isSolutionPublic(osMeta)) {
      return content;
    } else {
      const privatePath = path.join(
        this.privateContentDirectory,
        contentId,
        CONTENT_NAME,
      );
      const [h5pMeta, privateData] = await Promise.all([
        this.getMetadata(contentId),
        fsExtra.readJSON(privatePath),
      ]);
      return unyankAnswers(content, privateData, h5pMeta.mainLibrary);
    }
  }

  private async _findFilePath(id: string, filename: string) {
    const publicPath = path.join(this.contentPath, id, filename);
    const privatePath = path.join(this.privateContentDirectory, id, filename);
    if (await fsExtra.exists(publicPath)) {
      return publicPath;
    } else if (await fsExtra.exists(privatePath)) {
      return privatePath;
    } else {
      return undefined;
    }
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
