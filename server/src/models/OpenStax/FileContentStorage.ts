import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from './config';
import { CustomBaseError } from './errors';
import { assertValue } from '../../utils';

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
  mainLibrary: string
): [unknown, unknown] {
  return assertLibrary(mainLibrary).yankAnswers(content);
}

function unyankAnswers(
  publicData: unknown,
  privateData: unknown,
  mainLibrary: string
): unknown {
  return assertLibrary(mainLibrary).unyankAnswers(publicData, privateData);
}

function isSolutionPublic(osMeta: any): boolean {
  return (osMeta['is-solution-public'] ?? 'true') === 'true';
}

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  private privateContentDirectory: string;

  constructor(config: Config) {
    super(config.contentDirectory);
    this.privateContentDirectory = config.privateContentDirectory;
  }

  protected async writeJSON(path: string, obj: any) {
    await fsExtra.writeJSON(path, obj, { spaces: 2 });
  }

  public async addContent(
    metadata: H5P.IContentMetadata,
    content: any,
    user: H5P.IUser,
    id?: string | undefined
  ): Promise<string> {
    const osMeta = content.osMeta;
    const realId =
      id ?? assertValue<string>(osMeta.nickname?.trim() || undefined);
    const targetPath = path.join(this.contentPath, realId);
    const privatePath = path.join(this.privateContentDirectory, realId);
    const h5pPath = path.join(targetPath, H5P_NAME);
    delete content.osMeta;
    if (realId !== id && fsExtra.pathExistsSync(h5pPath)) {
      throw new CustomBaseError(`Duplicate id ${realId}`);
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
          metadata.mainLibrary
        );
        await fsExtra.ensureDir(privatePath);
        await this.writeJSON(path.join(privatePath, CONTENT_NAME), privateData);

        // write sanitized content object to content.json file
        content = sanitized;
      } else {
        await fsExtra.rm(privatePath, { recursive: true, force: true });
      }
      await fsExtra.ensureDir(targetPath);
      await Promise.all([
        this.writeJSON(path.join(targetPath, CONTENT_NAME), content),
        this.writeJSON(h5pPath, metadata),
        this.writeJSON(path.join(targetPath, METADATA_NAME), newOsMeta),
      ]);
    } catch (e) {
      await fsExtra.rm(targetPath, { recursive: true, force: true });
      throw e;
    }
    return realId;
  }

  public async deleteContent(contentId: string, user?: H5P.IUser) {
    const privatePath = path.join(this.privateContentDirectory, contentId);
    await Promise.all([
      super.deleteContent(contentId, user),
      fsExtra.rm(privatePath, { recursive: true, force: true }),
    ]);
  }

  public async getMetadata(
    contentId: string,
    user?: H5P.IUser
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

  public async getParameters(
    contentId: string,
    user?: H5P.IUser | undefined
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
        CONTENT_NAME
      );
      const [h5pMeta, privateData] = await Promise.all([
        this.getMetadata(contentId),
        fsExtra.readJSON(privatePath),
      ]);
      return unyankAnswers(content, privateData, h5pMeta.mainLibrary);
    }
  }
}
