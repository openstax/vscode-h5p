import * as path from 'path';
import * as fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';

const METADATA_NAME = 'metadata.json';

export default class OSStorage extends H5P.fsImplementations
  .FileContentStorage {
  protected async createContentId() {
    const numbered = fsExtra
      .readdirSync(this.getContentPath(), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => parseInt(d.name))
      .filter((n) => !isNaN(n))
      .sort();
    let i = 1;
    // Scan for first available id
    while (i < numbered.length && (i === numbered[i] || numbered.includes(i)))
      i++;
    return i.toString();
  }

  public async saveOSMeta(contentId: string, metadata: any) {
    await fsExtra.writeJSON(
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
