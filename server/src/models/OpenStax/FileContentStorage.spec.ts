import * as fsExtra from 'fs-extra';
import OSStorage from './FileContentStorage';
import mockfs from 'mock-fs';
import path from 'path';
import Config from './config';
import { NetworkMetadata } from '../../../../common/src/types';
import { IContentMetadata, IUser } from '@lumieducation/h5p-server';
import { assertValue } from '../../../../common/src/utils';

const VIRTUAL_ROOT = '/root';
const CONFIG = new Config(VIRTUAL_ROOT, 'interactives', 'private');
const PRIVATE_PATH = CONFIG.privateContentDirectory;
const MOCK_H5P_BASE: IContentMetadata = {
  title: 'default title',
  mainLibrary: 'H5P.Blanks',
  language: 'U',
  license: '',
  embedTypes: ['iframe'],
  preloadedDependencies: [],
  defaultLanguage: '',
};
const MOCK_OSMETA_BASE: Partial<NetworkMetadata> = {
  collaborator_solutions: [],
  is_solution_public: true,
};

function dirToObj(base: string) {
  const dir: Record<string, any> = {};
  fsExtra.readdirSync(base, { withFileTypes: true }).forEach((dirent) => {
    const p = path.join(base, dirent.name);
    dir[dirent.name] = dirent.isDirectory()
      ? dirToObj(p)
      : fsExtra.readFileSync(p, { encoding: 'utf-8' });
  });
  return dir;
}

const tryGet = (target: object, p: string | symbol) =>
  assertValue(Reflect.get(target, p), `Property not found ${String(p)}`);

const createStorageHarness = () => {
  const mockTempStorage = new Proxy({} as unknown as any, {
    get(target, p) {
      switch (p) {
        case 'getFileStream':
          return (tmpName: string) => ({
            pipe(output: fsExtra.WriteStream) {
              output.write(`<insert contents of ${tmpName}>`);
              output.end();
              return output;
            },
          });
      }
      return tryGet(target, p);
    },
  });
  return new Proxy(new OSStorage(CONFIG, mockTempStorage), {
    get(target, p) {
      switch (p) {
        case 'addContent':
          return (
            metadata: IContentMetadata,
            content: any,
            user: IUser,
            id?: string | undefined,
          ) => {
            const osMeta = {
              ...MOCK_OSMETA_BASE,
              ...(content?.osMeta ?? {}),
            };
            return target.addContent(
              { ...MOCK_H5P_BASE, ...metadata } as unknown as IContentMetadata,
              { ...content, osMeta },
              { ...user } as unknown as IUser,
              id,
            );
          };
      }
      return tryGet(target, p);
    },
  });
};

describe('File Content Storage', () => {
  beforeEach(() => {
    mockfs({
      [VIRTUAL_ROOT]: {
        ['interactives']: {
          '1': {
            'h5p.json': JSON.stringify({
              ...MOCK_H5P_BASE,
              title: 'this should be stored in folder 1',
            }),
            'content.json': JSON.stringify({}),
            'metadata.json': JSON.stringify({
              extra: 'Something extra',
            }),
          },
          'image-test': {
            media: {
              'detailed.png': '',
              '_questions.png': '',
              'unreferenced.png': '',
            },
            'metadata.json': JSON.stringify({
              attachments: ['media/unreferenced.png'],
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
    const storage = createStorageHarness();

    // Should use nickname as ID
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 2',
        } as unknown as IContentMetadata,
        {
          osMeta: { nickname: '2' },
        },
        {} as unknown as IUser,
      ),
    ).toBe('2');

    // Should use id argument
    expect(
      await storage.addContent(
        {
          title: 'this should be stored in folder 1234',
        } as unknown as IContentMetadata,
        {
          osMeta: {},
        },
        {} as unknown as IUser,
        '1234',
      ),
    ).toBe('1234');

    // Modifying existing content should not erase extra metadata
    await storage.addContent(
      {
        title: 'this should be stored in folder 1',
      } as unknown as IContentMetadata,
      {
        osMeta: {
          nickname: '1',
          books: [{ name: 'stax-test', lo: ['1-2-3'] }],
        },
      },
      {} as unknown as IUser,
      '1',
    );
    expect(await storage.getOSMeta('1')).toMatchObject({
      extra: 'Something extra',
    });

    // It should try to move images from temporary storage
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        osMeta: {
          nickname: 'image-test',
        },
        text: `<p>Fill in the missing words</p>
        <p><img data-filename="test.png" src="http://.../temp-files/images/not-used.png#tmp"/></p>
        `,
      },
      {} as unknown as IUser,
      'image-test',
    );

    // It should include attachments
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        osMeta: {
          nickname: 'image-test',
          collaborator_solutions: [
            {
              content: '<img src="media/detailed.png"/>',
              solution_type: 'detailed',
            },
          ],
          _questions: [
            {
              content: `<p><img src="media/_questions.png"></p>`,
            },
          ],
        },
        text: `<p>Fill in the missing words</p>
        <p><img src="media/test.png"/></p>
        `,
      },
      {} as unknown as IUser,
      'image-test',
    );

    const result = dirToObj(VIRTUAL_ROOT);
    mockfs.restore();
    expect(result).toMatchSnapshot();
  });
  it('throws an error if tmp items do not have a name', async () => {
    const storage = createStorageHarness();
    await expect(async () => {
      await storage.addContent(
        {} as unknown as IContentMetadata,
        {
          osMeta: {
            nickname: 'image-test',
          },
          text: `<p>Fill in the missing words</p>
          <p><img src="http://.../temp-files/images/not-used.png#tmp"/></p>
          `,
        },
        {} as unknown as IUser,
        'image-text',
      );
    }).rejects.toThrowError(/data-filename/);
  });
  it('converts invalid searchable values when loading', async () => {
    const storage = createStorageHarness();
    const id = '1234';
    await storage.addContent(
      {
        title: 1234 as any,
        mainLibrary: 5678 as any,
      } as unknown as IContentMetadata,
      {
        osMeta: {},
      },
      {} as unknown as IUser,
      id,
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
        const storage = createStorageHarness();
        const h5pContent = {
          fake: 'to make sure it is saved too',
          questions: [
            `<p>This should${
              !isSolutionPublic ? ' not ' : ' '
            }appear in the public folder</p>`,
          ],
        };
        await storage.addContent(
          {
            title: 'this should be stored in folder ' + id,
          } as unknown as IContentMetadata,
          {
            ...h5pContent,
            osMeta: {
              is_solution_public: isSolutionPublic,
            },
          },
          {} as unknown as IUser,
          id,
        );
        expect(await storage.getParameters(id)).toStrictEqual(h5pContent);
        const result = dirToObj(VIRTUAL_ROOT);
        mockfs.restore();
        expect(result).toMatchSnapshot();
      },
    );
  });
  it('throws an error when it cannot make solutions private', async () => {
    const storage = createStorageHarness();
    await expect(async () => {
      await storage.addContent(
        {
          mainLibrary: 'FAKE-FOR-TESTING-PURPOSES',
        } as unknown as IContentMetadata,
        {
          osMeta: {
            is_solution_public: false,
          },
        },
        {} as unknown as IUser,
        '1234',
      );
    }).rejects.toThrowError(
      'Cannot handle private answers for type "FAKE-FOR-TESTING-PURPOSES"',
    );
  });
  it('cleans up orphaned files on error', async () => {
    const storage = createStorageHarness();
    storage.getOSMeta = jest.fn().mockRejectedValue(new Error('TEST'));
    await expect(async () => {
      await storage.addContent(
        {} as unknown as IContentMetadata,
        {},
        {} as unknown as IUser,
        '1234',
      );
    }).rejects.toThrowError('TEST');
    expect(await storage.contentExists('1234')).toBe(false);
  });
  it('does not allow duplicate ids', async () => {
    const storage = createStorageHarness();
    await expect(async () => {
      await storage.addContent(
        {
          title: 'this should be stored in folder 1',
        } as unknown as IContentMetadata,
        {
          osMeta: { nickname: '1' },
        },
        {} as unknown as IUser,
      );
    }).rejects.toThrowError(/.*duplicate.*/i);
    expect(await storage.contentExists('1234')).toBe(false);
  });
  // Id 0 breaks the player (reason unknown)
  it('does not allow id 0', async () => {
    const storage = createStorageHarness();
    expect(async () => {
      await storage.addContent(
        {} as unknown as IContentMetadata,
        { osMeta: { nickname: '0' } },
        {} as unknown as IUser,
      );
    }).rejects.toThrow(/.*cannot be 0.*/);
  });
  it('deletes private data when content is deleted', async () => {
    const storage = createStorageHarness();
    const id = '12345';
    const h5pContent = {
      fake: 'to make sure it is saved too',
      questions: ['<p>Anything</p>'],
    };
    await storage.addContent(
      {
        title: 'this should be stored in folder 123456',
      } as unknown as IContentMetadata,
      {
        ...h5pContent,
        osMeta: {
          is_solution_public: false,
        },
      },
      {} as unknown as IUser,
      id,
    );

    expect(await storage.contentExists(id)).toBe(true);
    expect(fsExtra.existsSync(`${PRIVATE_PATH}/12345`)).toBe(true);

    await storage.deleteContent(id);
    expect(await storage.contentExists(id)).toBe(false);
    expect(fsExtra.existsSync(`${PRIVATE_PATH}/12345`)).toBe(false);
  });
  it('Searches for private and public files', async () => {
    mockfs({
      [VIRTUAL_ROOT]: {
        interactives: {
          '1': {
            media: {
              'b.png': '<contents of b.png>',
            },
          },
        },
        private: {
          interactives: {
            '1': {
              media: {
                'a.png': '<contents of a.png>',
              },
            },
          },
        },
      },
    });
    const storage = createStorageHarness();
    expect(await storage.getFileStats('1', 'media/a.png')).toBeDefined();
    expect(await storage.getFileStats('1', 'media/b.png')).toBeDefined();
    await expect(storage.getFileStats('1', 'media/c.png')).rejects.toThrowError(
      /content-file-missing/,
    );
  });
  it('Moves attachments when visibility changes', async () => {
    mockfs({
      [VIRTUAL_ROOT]: {
        interactives: {
          '1': {
            media: {},
          },
        },
        private: {
          interactives: {
            '1': {
              ['content.json']: JSON.stringify({
                text: '<img src="media/a.png"/>',
              }),
              media: {
                'a.png': '<contents of a.png>',
              },
            },
          },
        },
      },
    });
    const storage = createStorageHarness();
    const findFilePath = tryGet(storage, '_findFilePath').bind(storage);
    const image = 'media/a.png';
    const id = '1';
    const content = {
      questions: [`<img src="${image}"/>`],
      osMeta: {
        nickname: id,
        is_solution_public: false,
      },
    };
    await storage.addContent(
      {} as unknown as IContentMetadata,
      content,
      {} as unknown as IUser,
      id,
    );
    expect(await findFilePath(id, image)).toMatch(
      new RegExp(`${VIRTUAL_ROOT}/${CONFIG.privatePath}`),
    );
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        ...content,
        osMeta: {
          ...content.osMeta,
          is_solution_public: true,
        },
      },
      {} as unknown as IUser,
      id,
    );
    expect(await findFilePath(id, image)).toMatch(
      new RegExp(`${VIRTUAL_ROOT}/${CONFIG.contentPath}`),
    );
  });
  it('still works when the contentPath does not exist', async () => {
    mockfs({
      [VIRTUAL_ROOT]: {},
    });
    const storage = createStorageHarness();
    const expectedId = '1';
    expect(
      await storage.addContent(
        {
          title: `this should be stored in folder ${expectedId}`,
        } as unknown as IContentMetadata,
        {
          osMeta: { nickname: '1' },
        },
        {} as unknown as IUser,
      ),
    ).toBe('1');
  });
});
