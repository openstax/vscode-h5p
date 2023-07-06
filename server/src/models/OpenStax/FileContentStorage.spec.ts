import * as fsExtra from 'fs-extra';
import OSStorage from './FileContentStorage';
import mockfs from 'mock-fs';
import path from 'path';
import Config from '../config';

function dirToObj(base: string) {
  const dir = {};
  fsExtra.readdirSync(base, { withFileTypes: true }).forEach((dirent) => {
    const p = path.join(base, dirent.name);
    dir[dirent.name] = dirent.isDirectory()
      ? dirToObj(p)
      : fsExtra.readFileSync(p, { encoding: 'utf-8' });
  });
  return dir;
}

describe('File Content Storage', () => {
  const interactivesPath = '/interactives';
  const config = new Config('/');

  beforeEach(() => {
    mockfs({
      [interactivesPath]: {
        '9876': {
          'metadata.json': JSON.stringify({
            extra: 'Something extra',
            books: ['should-not-appear-in-snapshot'],
          }),
        },
      },
    });
  });
  afterEach(() => {
    mockfs.restore();
  });

  it('saves content as expected', async () => {
    const storage = new OSStorage(config);
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 1',
          mainLibrary: 'something',
          language: 'U',
          license: '',
          embedTypes: ['iframe'],
          preloadedDependencies: [],
          defaultLanguage: '',
        },
        {
          this: 'could',
          literally: 'be',
          anything: 'because',
          it: 'is',
          very: 'loosely',
          defined: true,
        },
        {} as any
      )
    ).toBe('1');
    await storage.saveOSMeta('1', { books: ['meta-1'] });
    // Make sure it does not overwrite existing directories
    fsExtra.ensureDirSync(path.join(interactivesPath, '2'));
    // And that it finds the next available id
    fsExtra.ensureDirSync(path.join(interactivesPath, '4'));
    // Since 2 exists, 3 should be next
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 3',
          mainLibrary: 'something',
          language: 'U',
          license: '',
          embedTypes: ['iframe'],
          preloadedDependencies: [],
          defaultLanguage: '',
        },
        {},
        {} as any
      )
    ).toBe('3');
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 1234',
          mainLibrary: 'something',
          language: 'U',
          license: '',
          embedTypes: ['iframe'],
          preloadedDependencies: [],
          defaultLanguage: '',
        },
        {},
        {} as any,
        '1234' // should use this id
      )
    ).toBe('1234');
    await storage.saveOSMeta('3', { books: ['meta-2'] });
    await storage.saveOSMeta('9876', { books: ['meta-3'] });
    expect(await storage.getOSMeta('1')).toStrictEqual({ books: ['meta-1'] });
    expect(await storage.getOSMeta('2')).toStrictEqual({});
    expect(await storage.getOSMeta('3')).toStrictEqual({ books: ['meta-2'] });
    expect(await storage.getOSMeta('9876')).toStrictEqual({
      books: ['meta-3'],
      extra: 'Something extra',
    });
    const result = dirToObj(interactivesPath);
    mockfs.restore();
    expect(result).toMatchSnapshot();
  });
  it('converts invalid searchable values when loading', async () => {
    const storage = new OSStorage(config);
    const id = '1234';
    await storage.addContent(
      {
        title: 1234 as any,
        mainLibrary: 5678 as any,
        language: 'U',
        license: '',
        embedTypes: ['iframe'],
        preloadedDependencies: [],
        defaultLanguage: '',
      },
      {},
      {} as any,
      id
    );
    const loaded = await storage.getMetadata(id);
    expect(typeof loaded.title).toBe('string');
    expect(typeof loaded.mainLibrary).toBe('string');
  });
});
