import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import * as fs from 'fs';
import Config from '../config';

const METADATA_NAME = 'metadata.json';
const CONTENT_NAME = 'content.json';

export default class OSStorage extends H5P.fsImplementations.FileContentStorage {

  private privateContentDirectory

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
    osMeta: H5P.IContentMetadata,
    content: any,
    user: H5P.IUser,
    id?: string | undefined
  ): Promise<string> {
    if (id === undefined || id === null) {
      id = await this.createContentId();
    }
    try {
      await fsExtra.ensureDir(path.join(this.contentPath, id));
      await this.writeJSON(
        path.join(this.contentPath, id, 'h5p.json'),
        osMeta
      );
      await this.writeJSON(
        path.join(this.contentPath, id, 'content.json'),
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
    switch (false) {
      case (metadata.title as unknown) instanceof String:
        metadata.title = metadata.title.toString();
      case (metadata.mainLibrary as unknown) instanceof String:
        metadata.mainLibrary = metadata.mainLibrary.toString();
    }
    return metadata;
  }

  public async saveOSMeta(contentId: string, osMeta: any) {
      // check if private
    const privatePath = path.join(this.privateContentDirectory, contentId);
    if (osMeta.isSolutionPublic === "false") {
      const h5pPath = path.join(this.contentPath, contentId, CONTENT_NAME);

      const h5p = await fsExtra.readJSON(h5pPath, 'utf8');

      // move answer data to private folder
      const privateData = {
        answers: h5p.answers,
      };

      await fsExtra.ensureDir(privatePath);
      await this.writeJSON(path.join(privatePath, 'content.json'), privateData);

      // remove answers from public h5p object
      delete h5p.answers;

      // write h5p object back to h5p file
      await this.writeJSON(h5pPath, h5p);
    } else {
      await fsExtra.ensureDir(privatePath);
      await fsExtra.rm(privatePath, {"recursive": true});
    }

    await this.writeJSON(
      path.join(this.contentPath, contentId, METADATA_NAME),
      osMeta
    );
  }

  public async getOSMeta(contentId: string) {
    const mdPath = path.join(this.contentPath, contentId, METADATA_NAME);
    if (!fsExtra.existsSync(mdPath)) {
      return {};
    }
    // read metadata
    // if private data exists, read it and add to file
    const osMeta = await fsExtra.readJSON(mdPath);
    if (osMeta.isSolutionPublic === "false") {
      const privatePath = path.join(this.privateContentDirectory, contentId, CONTENT_NAME);
      const privateData = await fsExtra.readJSON(privatePath);
      osMeta.answers = privateData.answers;
    }
    return osMeta;
  }

  public async getParameters(contentId: string, user?: H5P.IUser | undefined): Promise<any> {
    const content = await super.getParameters(contentId, user);
    const osMeta = await this.getOSMeta(contentId);
    if (osMeta.isSolutionPublic === "false") {
      content.answers = osMeta.answers;
    }
    const params = {
      ...osMeta,
      ...content,
    };
    return params;
  }
}