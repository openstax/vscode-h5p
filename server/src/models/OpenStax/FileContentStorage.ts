import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';

const METADATA_NAME = 'metadata.json';

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  protected async createContentId() {
    const idxOffset = 1;
    const numbered = fsExtra
      .readdirSync(this.getContentPath(), { withFileTypes: true })
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
      await fsExtra.ensureDir(path.join(this.getContentPath(), id));
      await this.writeJSON(
        path.join(this.getContentPath(), id, 'h5p.json'),
        metadata
      );
      await this.writeJSON(
        path.join(this.getContentPath(), id, 'content.json'),
        content
      );
    } catch (error) {
      /* istanbul ignore next */
      await fsExtra.remove(path.join(this.getContentPath(), id));
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

  public async saveOSMeta(contentId: string, metadata: any) {
    await this.writeJSON(
      path.join(this.getContentPath(), contentId, METADATA_NAME),
      metadata
    );
  }

  public async getOSMeta(contentId: string) {
    const mdPath = path.join(this.getContentPath(), contentId, METADATA_NAME);
    if (!fsExtra.existsSync(mdPath)) {
      return {};
    }
    return await fsExtra.readJSON(mdPath);
  }
}
