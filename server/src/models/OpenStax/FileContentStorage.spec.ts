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
  const config = new Config(VIRTUAL_ROOT, 'interactives', 'private');
  const interactivesPath = config.contentDirectory;
  const privatePath = config.privateContentDirectory;
  const fakeH5PBase = {
    mainLibrary: 'something',
    language: 'U',
    license: '',
    embedTypes: ['iframe'],
    preloadedDependencies: [],
    defaultLanguage: '',
  };

  beforeEach(() => {
    mockfs({
      [VIRTUAL_ROOT]: {
        ['interactives']: {
          '1': {
            'h5p.json': JSON.stringify({
              title: 'this should be stored in folder 1',
              ...fakeH5PBase,
            }),
            'content.json': JSON.stringify({}),
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

    // It shoould use this directory since it does not have an h5p file in it
    fsExtra.ensureDirSync(`${interactivesPath}/2`);
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 2',
        } as any,
        {
          osMeta: { books: ['meta-1'], nickname: '2' },
        },
        {} as any
      )
    ).toBe('2');
    const osMeta2 = {
      nickname: '101',
      books: ['something'],
    };
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 101',
          ...fakeH5PBase,
        } as any,
        {
          this: 'could',
          literally: 'be',
          anything: 'because',
          it: 'is',
          very: 'loosely',
          defined: true,
          osMeta: { ...osMeta2 },
        },
        {} as any
      )
    ).toBe('101');
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 102',
          ...fakeH5PBase,
        } as any,
        {
          osMeta: {
            books: ['meta-2'],
            nickname: '102'
          },
        },
        {} as any
      )
    ).toBe('102');
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 1234',
          ...fakeH5PBase,
        } as any,
        {
          osMeta: {},
        },
        {} as any,
        '1234' // should use this id
      )
    ).toBe('1234');
    // Modify existing content
    await storage.addContent(
      {
        title: 'this should be stored in folder 1',
        ...fakeH5PBase,
      } as any,
      { osMeta: { books: ['meta-3'], nickname: '1' } },
      {} as any,
      '1'
    );
    expect(await storage.getOSMeta('1')).toStrictEqual({
      books: ['meta-3'],
      extra: 'Something extra',
    });
    // title always overwrites nickname
    expect(await storage.getOSMeta('101')).toStrictEqual({
      books: osMeta2.books,
    });
    expect(await storage.getOSMeta('3')).toStrictEqual({});
    // When the nickname is not given, the h5p title is used
    expect(await storage.getOSMeta('102')).toStrictEqual({
      books: ['meta-2'],
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
      {
        osMeta: {},
      },
      {} as any,
      id
    );
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
          {
            ...h5pContent,
            osMeta: {
              'is-solution-public': isSolutionPublic.toString(),
            },
          },
          {} as any,
          id
        );
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
    await expect(async () => {
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
        {
          ...h5pContent,
          osMeta: {
            'is-solution-public': 'false',
          },
        },
        {} as any,
        '1234'
      );
    }).rejects.toThrowError(
      'Cannot handle private answers for type "FAKE-FOR-TESTING-PURPOSES"'
    );
  });
  it('cleans up orphaned files on error', async () => {
    const storage = new OSStorage(config);
    storage.getOSMeta = jest.fn().mockRejectedValue(new Error('TEST'));
    await expect(async () => {
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
        {
          osMeta: {},
        },
        {} as any,
        '1234'
      );
    }).rejects.toThrowError('TEST');
    expect(await storage.contentExists('1234')).toBe(false);
  });
  it('does not allow duplicate ids', async () => {
    const storage = new OSStorage(config);
    await expect(async () => {
      await storage.addContent(
        {
          title: 'this should be stored in folder 1',
          mainLibrary: 'H5P.Blanks',
          language: 'U',
          license: '',
          embedTypes: ['iframe'],
          preloadedDependencies: [],
          defaultLanguage: '',
        },
        {
          osMeta: { nickname: '1' },
        },
        {} as any
      );
    }).rejects.toThrowError(/.*duplicate.*/i);
    expect(await storage.contentExists('1234')).toBe(false);
  });
  it('deletes private data when content is deleted', async () => {
    const storage = new OSStorage(config);
    const id = '12345';
    const h5pContent = {
      fake: 'to make sure it is saved too',
      questions: ['<p>Anything</p>'],
    };
    await storage.addContent(
      {
        title: 'this should be stored in folder 123456',
        mainLibrary: 'H5P.Blanks',
        language: 'U',
        license: '',
        embedTypes: ['iframe'],
        preloadedDependencies: [],
        defaultLanguage: '',
      },
      {
        ...h5pContent,
        osMeta: {
          'is-solution-public': 'false',
        },
      },
      {} as any,
      id
    );

    expect(await storage.contentExists(id)).toBe(true);
    expect(fsExtra.existsSync(`${privatePath}/12345`)).toBe(true);

    await storage.deleteContent(id);
    expect(await storage.contentExists(id)).toBe(false);
    expect(fsExtra.existsSync(`${privatePath}/12345`)).toBe(false);
  });

  it('still works when the contentPath does not exist', async () => {
    mockfs({
      [VIRTUAL_ROOT]: {},
    });
    const storage = new OSStorage(config);
    const expectedId = '1';
    expect(
      await storage.addContent(
        {
          title: `this should be stored in folder ${expectedId}`,
          mainLibrary: 'H5P.Blanks',
          language: 'U',
          license: '',
          embedTypes: ['iframe'],
          preloadedDependencies: [],
          defaultLanguage: '',
        },
        {
          osMeta: { nickname: '1' },
        },
        {} as any
      )
    ).toBe('1');
  });
});
