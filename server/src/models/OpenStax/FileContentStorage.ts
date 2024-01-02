import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from './config';
import { CustomBaseError } from './errors';
import { assertValue } from '../../../../common/src/utils';
import { Readable } from 'stream';
import { H5pError } from '@lumieducation/h5p-server';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';

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

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  private readonly privateContentDirectory: string;

  constructor(config: Config) {
    super(config.contentDirectory);
    this.privateContentDirectory = config.privateContentDirectory;
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

  public override async addContent(
    metadata: H5P.IContentMetadata,
    content: any,
    _user: H5P.IUser,
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
    try {
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
        await this.writeJSON(realId, CONTENT_NAME, privateData, true);

        // write sanitized content object to content.json file
        content = sanitized;
      } else {
        await this.deletePrivateContent(realId);
      }
      await Promise.all([
        this.writeJSON(realId, CONTENT_NAME, content, false),
        this.writeJSON(realId, H5P_NAME, metadata, false),
        this.writeJSON(realId, METADATA_NAME, newOsMeta, false),
      ]);
    } catch (error) {
      await fsExtra.remove(path.join(this.getContentPath(), realId.toString()));
      throw new H5pError('storage-file-implementations:error-creating-content');
    }
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
}
