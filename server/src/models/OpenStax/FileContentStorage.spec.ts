import * as fsExtra from 'fs-extra';
import OSStorage, { fixNamespaces } from './FileContentStorage';
import mockfs from 'mock-fs';
import path from 'path';
import Config, { SupportedLibrary } from './config';
import { NetworkMetadata } from '../../../../common/src/types';
import { IContentMetadata, IUser } from '@lumieducation/h5p-server';
import { assertValue } from '../../../../common/src/utils';
import { yankByKeysFactory } from './AnswerYankers';

const VIRTUAL_ROOT = '/root';
const CONFIG = new Config(VIRTUAL_ROOT, 'interactives', 'private');
const PRIVATE_PATH = CONFIG.privateContentDirectory;
const TEST_LIBRARY = 'Test.Library';
const MOCK_H5P_BASE: IContentMetadata = {
  title: 'default title',
  mainLibrary: TEST_LIBRARY,
  language: 'U',
  license: '',
  embedTypes: ['iframe'],
  preloadedDependencies: [],
  defaultLanguage: '',
};
const MOCK_OSMETA_BASE: Partial<NetworkMetadata> = {};
const MOCK_CONTENT_BASE = { isSolutionPublic: true };

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
  const storage = new Proxy(new OSStorage(CONFIG, mockTempStorage), {
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
              { ...MOCK_CONTENT_BASE, ...content, osMeta },
              { ...user } as unknown as IUser,
              id,
            );
          };
      }
      return tryGet(target, p);
    },
  });
  // Patch for testing without being coupled to config
  Reflect.set(
    storage,
    'assertLibrary',
    (): SupportedLibrary => ({
      yankAnswers: yankByKeysFactory('questions'),
      isSolutionPublic: (content) =>
        Reflect.get(content, 'isSolutionPublic') === true,
    }),
  );
  return storage;
};

describe('File Content Storage', () => {
  beforeEach(() => {
    mockfs({
      [VIRTUAL_ROOT]: {
        interactives: {
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
          _additional_field: [
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
          isSolutionPublic,
        };
        await storage.addContent(
          {
            title: 'this should be stored in folder ' + id,
          } as unknown as IContentMetadata,
          {
            ...h5pContent,
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
        isSolutionPublic: false,
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
      },
    };
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        ...content,
        isSolutionPublic: false,
      },
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
        isSolutionPublic: true,
      },
      {} as unknown as IUser,
      id,
    );
    expect(await findFilePath(id, image)).toMatch(
      new RegExp(`${VIRTUAL_ROOT}/${CONFIG.contentPath}`),
    );
  });
  it('correctly handles unreferenced images', async () => {
    mockfs({
      [VIRTUAL_ROOT]: {
        interactives: {
          '1': {
            media: {
              'a.png': '<contents of a.png>',
            },
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
    const findFilePaths = tryGet(storage, '_findFilePaths').bind(storage);
    const image = 'media/a.png';
    const id = '1';
    const baseContent = {
      text: `<img src="${image}"/>`,
      questions: [`<img src="${image}"/>`],
      isSolutionPublic: false,
      osMeta: {
        nickname: id,
      },
    };
    let paths: Partial<Record<'public' | 'private', string>>;
    await storage.addContent(
      {} as unknown as IContentMetadata,
      baseContent,
      {} as unknown as IUser,
      id,
    );
    // Image should exist in both public and private storage
    paths = await findFilePaths(id, image);
    expect(paths.public).toBeDefined();
    expect(paths.private).toBeDefined();

    // WHEN: Solutions are made public
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        ...baseContent,
        isSolutionPublic: true,
        osMeta: {
          ...baseContent.osMeta,
        },
      },
      {} as unknown as IUser,
      id,
    );
    // THEN: Only the public storage should contain the image
    paths = await findFilePaths(id, image);
    expect(paths.public).toBeDefined();
    expect(paths.private).not.toBeDefined();

    // WHEN: Solutions are made private again
    await storage.addContent(
      {} as unknown as IContentMetadata,
      baseContent,
      {} as unknown as IUser,
      id,
    );
    // THEN: Both public and private storage should contain the image
    paths = await findFilePaths(id, image);
    expect(paths.public).toBeDefined();
    expect(paths.private).toBeDefined();

    // WHEN: Image is no longer referenced in public content
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        ...baseContent,
        text: '',
      },
      {} as unknown as IUser,
      id,
    );
    // THEN: Image is not in public storage
    paths = await findFilePaths(id, image);
    expect(paths.public).not.toBeDefined();
    expect(paths.private).toBeDefined();

    // WHEN: Image is no longer referenced in either location
    await storage.addContent(
      {} as unknown as IContentMetadata,
      {
        ...baseContent,
        questions: [''],
        text: '',
      },
      {} as unknown as IUser,
      id,
    );
    // THEN: Image is gone
    paths = await findFilePaths(id, image);
    expect(paths.public).not.toBeDefined();
    expect(paths.private).not.toBeDefined();
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

  describe('fixNamespaces', () => {
    it('adds mathml namespace', () => {
      const content = {
        x: [
          '<math t="1"><mi a="test">x</mi></math>',
          '<div>something</div>',
          '<math><mrow xmlns:t="http://example.com" t:b="x"><mi>y</mi></mrow>' +
            '</math>',
          '<math><mi>z</mi></math>',
          '<math xmlns="not-xhtml-namespace"><mi>w</mi></math>',
        ].join('\n'),
      };
      fixNamespaces(content);
      expect(content.x).toBe(
        [
          '<math t="1" xmlns="http://www.w3.org/1998/Math/MathML">' +
            '<mi a="test">x</mi></math>',
          '<div>something</div>',
          '<math xmlns="http://www.w3.org/1998/Math/MathML">' +
            '<mrow xmlns:t="http://example.com" t:b="x">' +
            '<mi>y</mi>' +
            '</mrow></math>',
          '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math>',
          '<math xmlns="not-xhtml-namespace"><mi>w</mi></math>',
        ].join('\n'),
      );
    });
  });
});
