import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from '../config';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';

const privateDataKeyMap: Record<string, string[]> = {
  'H5P.Blanks': ['questions'],
  'H5P.MultiChoice': ['answers'],
};

function yankAnswers(content: any, mainLibrary: string): [any, any] {
  const privateDataKeys = privateDataKeyMap[mainLibrary];
  if ((privateDataKeys?.length ?? 0) === 0) {
    throw new Error(`Cannot handle private answers for type "${mainLibrary}"`);
  }
  const privateData = {};
  privateDataKeys.forEach((key) => {
    privateData[key] = content[key];
    delete content[key];
  });
  return [content, privateData];
}

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  private privateContentDirectory: string;

  constructor(config: Config) {
    super(config.contentDirectory);
    this.privateContentDirectory = config.privateContentDirectory;
  }

  protected async createContentId() {
    const idxOffset = 1;
    const numbered = fsExtra
      .readdirSync(this.contentPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => parseInt(d.name))
      .filter((n) => !isNaN(n))
      .sort();
    const i = numbered.findIndex((v, idx) => v - idxOffset !== idx);
    return ((i === -1 ? numbered.length : i) + idxOffset).toString();
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
    if (id === undefined || id === null) {
      id = await this.createContentId();
    }
    try {
      await fsExtra.ensureDir(path.join(this.contentPath, id));
      await this.writeJSON(path.join(this.contentPath, id, H5P_NAME), metadata);
      await this.writeJSON(
        path.join(this.contentPath, id, CONTENT_NAME),
        content
      );
    } catch (error) {
      /* istanbul ignore next */
      await fsExtra.remove(path.join(this.contentPath, id));
      /* istanbul ignore next */
      throw new H5P.H5pError(
        'storage-file-implementations:error-creating-content'
      );
    }
    return id;
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

  public async saveOSMeta(contentId: string, osMeta: any) {
    // check if private
    const privatePath = path.join(this.privateContentDirectory, contentId);
    if (osMeta.isSolutionPublic === 'false') {
      const contentPath = path.join(this.contentPath, contentId, CONTENT_NAME);

      const content = await super.getParameters(contentId);
      const h5pMeta = await this.getMetadata(contentId);

      const [sanitized, privateData] = yankAnswers(
        content,
        h5pMeta.mainLibrary
      );

      await fsExtra.ensureDir(privatePath);
      await this.writeJSON(path.join(privatePath, 'content.json'), privateData);

      // write sanitized content object back to content.json file
      await this.writeJSON(contentPath, sanitized);
    } else {
      await fsExtra.rm(privatePath, { recursive: true, force: true });
    }

    await this.writeJSON(
      path.join(this.contentPath, contentId, METADATA_NAME),
      { ...(await this.getOSMeta(contentId)), ...osMeta }
    );
  }

  public async getOSMeta(contentId: string) {
    const mdPath = path.join(this.contentPath, contentId, METADATA_NAME);
    return fsExtra.existsSync(mdPath) ? await fsExtra.readJSON(mdPath) : {};
  }

  public async getParameters(
    contentId: string,
    user?: H5P.IUser | undefined
  ): Promise<any> {
    const content = await super.getParameters(contentId, user);
    const osMeta = await this.getOSMeta(contentId);
    if (osMeta.isSolutionPublic == 'true') {
      return content;
    }
    const privatePath = path.join(
      this.privateContentDirectory,
      contentId,
      CONTENT_NAME
    );
    const privateData = await fsExtra.readJSON(privatePath);
    return {
      ...content,
      ...privateData,
    };
  }
}
