import axios from 'axios';
/**
 * This service performs queries at the REST endpoint of the content type cache.
 */
export default class ContentTypeCacheService {
  constructor(private baseUrl: string) {}

  /**
   * Gets the last update date and time.
   */
  public async getCacheUpdate(): Promise<Date | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/update`);

      const { lastUpdate } = response.data;
      return lastUpdate === null ? null : new Date(lastUpdate);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Triggers a content type cache update that will contact the H5P Hub and
   * retrieve the latest content type list.
   */
  public async postUpdateCache(): Promise<Date> {
    try {
      const response = await axios.post(`${this.baseUrl}/update`);
      return new Date(response.data.lastUpdate);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
