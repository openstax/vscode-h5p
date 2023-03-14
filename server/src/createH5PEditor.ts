import { Cache, caching } from 'cache-manager';
import debug from 'debug';
import * as H5P from '@lumieducation/h5p-server';

/**
 * Create a H5PEditor object.
 * Which storage classes are used depends on the configuration values set in
 * the environment variables.re If you set no environment variables, the local
 * filesystem storage classes will be used.
 *
 * CONTENTSTORAGE=mongos3 Uses MongoDB/S3 backend for content storage
 * CONTENT_MONGO_COLLECTION Specifies the collection name for content storage
 * CONTENT_AWS_S3_BUCKET Specifies the bucket name for content storage
 * TEMPORARYSTORAGE=s3 Uses S3 backend for temporary file storage
 * TEMPORARY_AWS_S3_BUCKET Specifies the bucket name for temporary file storage
 *
 * Further environment variables to set up MongoDB and S3 can be found in
 * docs/packages/h5p-mongos3/mongo-s3-content-storage.md and docs/packages/h5p-mongos3/s3-temporary-file-storage.md!
 * @param config the configuration object
 * @param localLibraryPath a path in the local filesystem in which the H5P libraries (content types) are stored
 * @param localContentPath a path in the local filesystem in which H5P content will be stored (only necessary if you want to use the local filesystem content storage class)
 * @param localTemporaryPath a path in the local filesystem in which temporary files will be stored (only necessary if you want to use the local filesystem temporary file storage class).
 * @param translationCallback a function that is called to retrieve translations of keys in a certain language; the keys use the i18next format (e.g. namespace:key).
 * @returns a H5PEditor object
 */
export default async function createH5PEditor(
    config: H5P.IH5PConfig,
    localLibraryPath: string,
    localContentPath?: string,
    localTemporaryPath?: string,
    localContentUserDataPath?: string,
    translationCallback?: H5P.ITranslationFunction
): Promise<H5P.H5PEditor> {
    let cache: Cache;
    if (process.env.CACHE === 'in-memory') {
        debug('h5p-server')(
            `Using in memory cache for caching library storage.`
        );
        cache = caching({
            store: 'memory',
            ttl: 60 * 60 * 24,
            max: 2 ** 10
        });
    } else {
        debug('h5p-example')('Not using any cache for library storage');
        // using no cache
    }



    // Depending on the environment variables we use different implementations
    // of the storage interfaces.

    const h5pEditor = new H5P.H5PEditor(
        new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
        config,
        process.env.CACHE ? new H5P.cacheImplementations.CachedLibraryStorage( new H5P.fsImplementations.FileLibraryStorage(
          localLibraryPath
      ), cache)
            : new H5P.fsImplementations.FileLibraryStorage(
              localLibraryPath
          ),
        new H5P.fsImplementations.FileContentStorage(localContentPath),
        new H5P.fsImplementations.DirectoryTemporaryFileStorage( localTemporaryPath),
        translationCallback,
        undefined,
        {
            enableHubLocalization: true,
            enableLibraryNameLocalization: true,
            lockProvider: new H5P.SimpleLockProvider()
        }
    );

    return h5pEditor;
}
