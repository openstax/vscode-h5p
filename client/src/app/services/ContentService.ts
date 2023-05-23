import type {
  IEditorModel,
  IPlayerModel,
  IContentMetadata,
} from '@lumieducation/h5p-server';
import axios from 'axios';

export interface IContentListEntry {
  h5PUrl: string;
  contentId: string;
  mainLibrary: string;
  title: string;
  originalNewKey?: string;
}

export interface IContentService {
  delete(contentId: string): Promise<void>;
  getEdit(contentId: string): Promise<IEditorModel>;
  getPlay(contentId: string): Promise<IPlayerModel>;
  list(): Promise<IContentListEntry[]>;
  save(
    contentId: string,
    requestBody: { library: string; params: any }
  ): Promise<{ contentId: string; metadata: IContentMetadata }>;
  generateDownloadLink(contentId: string): string;
}

export class ContentService implements IContentService {
  /**
   *
   */
  constructor(protected baseUrl: string = '') {}

  private csrfToken: string | undefined = undefined;

  delete = async (contentId: string): Promise<void> => {
    console.log(`ContentService: deleting ${contentId}...`);
    try {
      const result = await axios.delete(`${this.baseUrl}/${contentId}`, {
        method: 'delete',
        headers: {
          'CSRF-Token': this.csrfToken ?? '',
        },
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  getEdit = async (contentId: string): Promise<IEditorModel> => {
    console.log(`ContentService: Getting information to edit ${contentId}...`);
    try {
      const res = await axios.get(`${this.baseUrl}/${contentId}/edit`);
      return res.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  getPlay = async (contentId: string): Promise<IPlayerModel> => {
    console.log(`ContentService: Getting information to play ${contentId}...`);
    try {
      const res = await axios.get(`${this.baseUrl}/${contentId}/play`);
      return res.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  list = async (): Promise<IContentListEntry[]> => {
    console.log(`ContentService: Listing content objects`);
    try {
      const result = await axios.get(this.baseUrl);
      return result.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  save = async (
    contentId: string,
    requestBody: { library: string; params: any }
  ): Promise<{ contentId: string; metadata: IContentMetadata }> => {
    if (contentId) {
      console.log(`ContentService: Saving new content.`);
    } else {
      console.log(`ContentService: Saving content ${contentId}`);
    }

    const body = JSON.stringify(requestBody);
    try {
      const res = contentId
        ? await axios.patch(`${this.baseUrl}/${contentId}`, body, {
            headers: {
              'Content-Type': 'application/json',
              'CSRF-Token': this.csrfToken ?? '',
            },
          })
        : await axios.post(this.baseUrl, body, {
            headers: {
              'Content-Type': 'application/json',
              'CSRF-Token': this.csrfToken ?? '',
            },
          });
      return res.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
  generateDownloadLink = (contentId: string): string =>
    `${this.baseUrl}/download/${contentId}`;

  setCsrfToken = (csrfToken): void => {
    this.csrfToken = csrfToken;
  };
  getCsrfToken = (): string | undefined => {
    return this.csrfToken;
  };
}
