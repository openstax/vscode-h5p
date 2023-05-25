import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  protected async createContentId() {
    return randomUUID();
  }

  public async saveOSMeta(contentId: string, metadata: any) {
    await fsExtra.writeJSON(
      path.join(this.getContentPath(), contentId, 'metadata.json'),
      metadata
    );
  }

  public async getOSMeta(contentId: string) {
    const mdPath = path.join(this.getContentPath(), contentId, 'metadata.json');
    if (!fsExtra.existsSync(mdPath)) {
      return {};
    }
    return await fsExtra.readJSON(mdPath);
  }
}
