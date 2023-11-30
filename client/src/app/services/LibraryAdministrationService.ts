import type {
  IInstalledLibrary,
  ILibraryAdministrationOverviewItem,
} from '@lumieducation/h5p-server';
import axios from 'axios';

/**
 * The data model used to display the library list.
 */
export interface ILibraryViewModel extends ILibraryAdministrationOverviewItem {
  details?: IInstalledLibrary & {
    dependentsCount: number;
    instancesAsDependencyCount: number;
    instancesCount: number;
    isAddon: boolean;
  };
  isDeleting?: boolean;
  isShowingDetails?: boolean;
}

/**
 *
 */
export class LibraryAdministrationService {
  constructor(private baseUrl: string) {}

  public async deleteLibrary(library: ILibraryViewModel): Promise<void> {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
      );

      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async getLibraries(): Promise<ILibraryViewModel[]> {
    try {
      const response = await axios.get(this.baseUrl);

      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async getLibrary(library: ILibraryViewModel): Promise<
    IInstalledLibrary & {
      dependentsCount: number;
      instancesAsDependencyCount: number;
      instancesCount: number;
      isAddon: boolean;
    }
  > {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
      );
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async patchLibrary(
    library: ILibraryViewModel,
    changes: Partial<ILibraryViewModel>,
  ): Promise<ILibraryViewModel> {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
        {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
          },
          body: JSON.stringify(changes),
        },
      );
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async postPackage(
    file: File,
  ): Promise<{ installed: number; updated: number }> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(this.baseUrl, formData);
      const result = response.data;
      return { installed: result.installed, updated: result.updated };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
