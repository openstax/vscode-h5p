import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import Config from './config';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';
const H5P_NAME = 'h5p.json';

function yankAnswers(
  content: unknown,
  mainLibrary: string
): [unknown, unknown] {
  const library = Config.supportedLibraries[mainLibrary];
  if (library == null) {
    throw new Error(`Cannot handle private answers for type "${mainLibrary}"`);
  }
  return library.yankAnswers(content);
}

function unyankAnswers(
  publicData: unknown,
  privateData: unknown,
  mainLibrary: string
): unknown {
  const library = Config.supportedLibraries[mainLibrary];
  if (library == null) {
    throw new Error(`Cannot handle private answers for type "${mainLibrary}"`);
  }
  return library.unyankAnswers(publicData, privateData);
}

function isSolutionPublic(osMeta: any): boolean {
  return (osMeta['is-solution-public'] ?? 'true') === 'true';
}

type ContentTransaction = {
  metadata: H5P.IContentMetadata;
  content: any;
};

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  private privateContentDirectory: string;
  private pending: Record<string, ContentTransaction> = {};

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
    this.pending[id] = {
      metadata,
      content,
    };
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
    try {
      const privatePath = path.join(this.privateContentDirectory, contentId);
      const targetPath = path.join(this.contentPath, contentId);
      let { content, metadata: h5pMeta } = this.pending[contentId] ?? {
        content: await super.getParameters(contentId),
        metadata: await super.getMetadata(contentId),
      };
      // check if private
      if (!isSolutionPublic(osMeta)) {
        const [sanitized, privateData] = yankAnswers(
          content,
          h5pMeta.mainLibrary
        );

        await fsExtra.ensureDir(privatePath);
        await this.writeJSON(path.join(privatePath, CONTENT_NAME), privateData);

        // write sanitized content object to content.json file
        content = sanitized;
      } else {
        await fsExtra.rm(privatePath, { recursive: true, force: true });
      }

      await fsExtra.ensureDir(targetPath);

      try {
        await Promise.all([
          this.writeJSON(path.join(targetPath, CONTENT_NAME), content),
          this.writeJSON(path.join(targetPath, H5P_NAME), h5pMeta),
          this.writeJSON(path.join(targetPath, METADATA_NAME), {
            ...(await this.getOSMeta(contentId)),
            ...osMeta,
          }),
        ]);
      } catch (e) {
        await fsExtra.rm(targetPath, { recursive: true, force: true });
        throw e;
      }
    } finally {
      delete this.pending[contentId];
    }
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
      const h5pMeta = await this.getMetadata(contentId);
      const privateData = await fsExtra.readJSON(privatePath);
      return unyankAnswers(content, privateData, h5pMeta.mainLibrary);
    }
  }
}
