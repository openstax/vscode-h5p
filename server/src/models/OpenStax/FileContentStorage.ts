import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from './config';
import { CustomBaseError } from './errors';
import { assertTrue, assertValue } from '../../../../common/src/utils';
import { iterContent, iterHTML } from './ContentMutators';
import { Readable } from 'stream';
import { H5pError } from '@lumieducation/h5p-server';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';
const IMG_DIR = 'images';

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

function isSolutionPublic(osMeta: any): boolean {
  return (osMeta['is-solution-public'] ?? 'true') === 'true';
}

function replaceTempImages(content: unknown, pathPrefix: string) {
  const replaced: Array<{ tmpName: string; newName: string }> = [];
  iterHTML(content, ({ document }) => {
    document
      .xpath<Element>('//img[@data-filename][@src]')
      .filter((img) => img.getAttribute('src')?.endsWith('#tmp') === true)
      .forEach((img) => {
        const src = assertValue(img.getAttribute('src'));
        const name = assertValue(img.getAttribute('data-filename'));
        const { pathname } = new URL(src);
        const tmpName = `images/${path.basename(pathname)}`; // images prefix hardcoded into h5p-server/src/H5PEditor.ts
        const newName = `${pathPrefix}/${name}`; // Our prefix can be anything
        replaced.push({ tmpName, newName });
        img.removeAttribute('data-filename');
        img.setAttribute('src', newName);
      });
  });
  return replaced;
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

  public override async addContent(
    metadata: H5P.IContentMetadata,
    content: any,
    user: H5P.IUser,
    id?: string | undefined,
  ): Promise<string> {
    const osMeta = content.osMeta;
    const realId = id ?? assertValue<string>(osMeta.nickname?.trim());
    delete content.osMeta;
    if (realId !== id) {
      if (await this.contentExists(realId)) {
        throw new CustomBaseError(`Duplicate id ${realId}`);
      }
    }
    const newOsMeta = {
      ...(await this.getOSMeta(realId)),
      ...osMeta,
    };
    delete newOsMeta.nickname;
    if (!isSolutionPublic(osMeta)) {
      const [sanitized, privateData] = yankAnswers(
        content,
        metadata.mainLibrary,
      );
      // Replace images in private content
      const imagesReplaced = replaceTempImages(privateData, IMG_DIR);
      validateContent(privateData);
      await this.moveTempFiles(imagesReplaced, realId, user, true);
      await this.writeJSON(realId, CONTENT_NAME, privateData, true);

      // write sanitized content object to content.json file
      content = sanitized;
    } else {
      await this.deletePrivateContent(realId);
    }
    // Replace images in pubic content
    const imagesReplaced = replaceTempImages(content, IMG_DIR);
    validateContent(content);
    await Promise.all([
      this.moveTempFiles(imagesReplaced, realId, user, false),
      this.writeJSON(realId, CONTENT_NAME, content, false),
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

  public async getOSMeta(contentId: string) {
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

  override async getFileStats(
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
