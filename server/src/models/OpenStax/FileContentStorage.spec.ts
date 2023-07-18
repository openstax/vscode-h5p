import * as fsExtra from 'fs-extra';
import OSStorage from './FileContentStorage';
import mockfs from 'mock-fs';
import path from 'path';
import Config from './config';

const VIRTUAL_ROOT = '/root';

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
  const interactivesPath = `${VIRTUAL_ROOT}/interactives`;
  const config = new Config(VIRTUAL_ROOT, 'interactives', 'private');

  beforeEach(() => {
    mockfs({
      [VIRTUAL_ROOT]: {
        ['interactives']: {
          '1': {
            'metadata.json': JSON.stringify({
              extra: 'Something extra',
              books: ['should-not-appear-in-snapshot'],
            }),
          },
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
          title: 'this should be stored in folder 2',
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
    ).toBe('2');
    await storage.saveOSMeta('2', { books: ['meta-1'] });
    // Make sure it does not overwrite existing directories
    fsExtra.ensureDirSync(path.join(interactivesPath, '3'));
    // And that it finds the next available id
    fsExtra.ensureDirSync(path.join(interactivesPath, '5'));
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
    ).toBe('4');
    await storage.saveOSMeta('4', { books: ['meta-2'] });
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
        {},
        {} as any,
        '1' // should use this id
      )
    ).toBe('1');
    await storage.saveOSMeta('1', { books: ['meta-3'] });
    expect(await storage.getOSMeta('2')).toStrictEqual({ books: ['meta-1'] });
    expect(await storage.getOSMeta('3')).toStrictEqual({});
    expect(await storage.getOSMeta('4')).toStrictEqual({ books: ['meta-2'] });
    expect(await storage.getOSMeta('1')).toStrictEqual({
      books: ['meta-3'],
      extra: 'Something extra',
    });
    const result = dirToObj(VIRTUAL_ROOT);
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
    await storage.saveOSMeta('1234', {});
    const loaded = await storage.getMetadata(id);
    expect(typeof loaded.title).toBe('string');
    expect(typeof loaded.mainLibrary).toBe('string');
  });
  ['1234', '12345'].forEach((id) => {
    const isSolutionPublic = id !== '1234';
    it(
      `${id}: ` +
        (!isSolutionPublic
          ? 'removes private solutions'
          : 'leaves public solutions'),
      async () => {
        const storage = new OSStorage(config);
        const h5pContent = {
          fake: 'to make sure it is saved too',
          questions: [
            `<p>This should ${
              !isSolutionPublic ? 'not' : ''
            } appear in the content.json</p>`,
          ],
        };
        await storage.addContent(
          {
            title: 'this should be stored in folder ' + id,
            mainLibrary: 'H5P.Blanks',
            language: 'U',
            license: '',
            embedTypes: ['iframe'],
            preloadedDependencies: [],
            defaultLanguage: '',
          },
          h5pContent,
          {} as any,
          id
        );
        await storage.saveOSMeta(id, {
          'is-solution-public': isSolutionPublic.toString(),
        });
        expect(await storage.getParameters(id)).toStrictEqual(h5pContent);
        const result = dirToObj(VIRTUAL_ROOT);
        mockfs.restore();
        expect(result).toMatchSnapshot();
      }
    );
  });
  it('throws an error when it cannot make solutions private', async () => {
    const storage = new OSStorage(config);
    const h5pContent = {
      fake: 'to make sure it is saved too',
    };
    await storage.addContent(
      {
        title: '',
        mainLibrary: 'FAKE-FOR-TESTING-PURPOSES',
        language: 'U',
        license: '',
        embedTypes: ['iframe'],
        preloadedDependencies: [],
        defaultLanguage: '',
      },
      h5pContent,
      {} as any,
      '1234'
    );
    let err = '';
    try {
      await storage.saveOSMeta('1234', {
        'is-solution-public': 'false',
      });
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toEqual(
      'Cannot handle private answers for type "FAKE-FOR-TESTING-PURPOSES"'
    );
  });
  it('cleans up orphaned files on error', async () => {
    const storage = new OSStorage(config);
    storage.getOSMeta = jest.fn().mockRejectedValue(new Error('TEST'));
    await storage.addContent(
      {
        title: '',
        mainLibrary: 'H5P.Blanks',
        language: 'U',
        license: '',
        embedTypes: ['iframe'],
        preloadedDependencies: [],
        defaultLanguage: '',
      },
      {},
      {} as any,
      '1234'
    );
    let err = '';
    try {
      await storage.saveOSMeta('1234', {});
    } catch (e) {
      err = (e as Error).message;
    }
    expect(err).toEqual('TEST');
    expect(await storage.contentExists('1234')).toBe(false);
  });
});
