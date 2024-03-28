import mockfs from 'mock-fs';
import { extractArchive, getIps, parseBooksXML, recursiveMerge } from './utils';
import fsExtra from 'fs-extra';
import path from 'path';
import decompress from 'decompress';
import { networkInterfaces } from 'os';

jest.mock('decompress', () => jest.fn());
jest.mock('node-fetch', () => jest.fn());
jest.mock('os', () => {
  const origOs = jest.requireActual('os');
  return {
    ...origOs,
    networkInterfaces: jest.fn(),
  };
});

function setupMockfs(fsImpl: Record<string, any>) {
  // Required to avoid jest buffered messages (which fails with mock fs)
  console.log = jest.fn();
  console.debug = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();

  mockfs(fsImpl);
}

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

describe('Utility functions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const testPath = '/test';
  describe('extractArchive', () => {
    beforeEach(() => {
      setupMockfs({
        '/myzip.zip': '',
        [testPath]: {
          'a.txt': '',
          'b.txt': '',
          'c.txt': '',
        },
      });
      (decompress as unknown as jest.Mock).mockImplementation(() => {
        return [
          { path: '/test/a.txt' },
          { path: '/test/b.txt' },
          { path: '/test/c.txt' },
        ];
      });
    });
    afterEach(() => {
      mockfs.restore();
    });
    it('extracts selected files', async () => {
      await extractArchive('/myzip.zip', testPath, {
        deleteArchive: true,
        filesToExtract: ['/test/a.txt'],
      });
      const result = dirToObj(testPath);
      mockfs.restore();
      expect(result).toMatchSnapshot();
    });
    it('extracts all files', async () => {
      await extractArchive('/myzip.zip', testPath);
      const result = dirToObj(testPath);
      mockfs.restore();
      expect(result).toMatchSnapshot();
    });
  });
  describe('getIps', () => {
    it('gets localhost by default', () => {
      expect(getIps()).toStrictEqual(['localhost']);
    });
    it('filters to external ipv4 addresses', () => {
      const fakeDevInts = [
        [{ internal: false, family: 'IPv4', address: '1.2.3.4' }],
        [{ internal: true, family: 'IPv4', address: '127.0.0.1' }],
      ] as any;
      (networkInterfaces as unknown as jest.Mock).mockReturnValue(fakeDevInts);
      expect(getIps(true)).toStrictEqual(['1.2.3.4']);
    });
  });
  describe('parseBooksXML', () => {
    beforeEach(() => {
      setupMockfs({
        'books.xml': `\
<container xmlns="https://openstax.org/namespaces/book-container" version="2"> 
  <book slug="a" collection-id="??" style="dummy" href="goes/to/someplace"/>

  <var name="PUBLIC_ROOT" value="test" />
</container>`,
      });
    });
    afterEach(() => {
      mockfs.restore();
    });
    it('gets values and sets defaults', () => {
      const booksXml = parseBooksXML('books.xml');
      expect(booksXml).toMatchSnapshot();
    });
  });
  describe('recursiveMerge', () => {
    it('merges objects', () => {
      let result = recursiveMerge({ a: 1 }, { b: 2 });
      expect(result).toStrictEqual({ a: 1, b: 2 });
      // throws when the keys exists in both
      expect(() => recursiveMerge({ a: 1 }, { a: 2 })).toThrow(/Cannot merge/);
      // Favors non-null
      result = recursiveMerge({ a: 1 }, { a: null });
      expect(result).toStrictEqual({ a: 1 });
      // Deeply merges objects
      result = recursiveMerge({ a: { b: { c: 1 } } }, { a: { b: { d: 2 } } });
      expect(result).toStrictEqual({ a: { b: { c: 1, d: 2 } } });
    });
    it('merges arrays by index by default', () => {
      // throws when the values exists in both places
      expect(() => recursiveMerge([1], [2])).toThrow(/Cannot merge/);
      // Favors non-null
      let result = recursiveMerge([1, null, 3], [null, 2, null]);
      expect(result).toStrictEqual([1, 2, 3]);
      // Deeply merges arrays
      result = recursiveMerge([{ a: { b: 1 } }], [{ a: { c: 2 } }]);
      expect(result).toStrictEqual([{ a: { b: 1, c: 2 } }]);
    });
    it('returns rhs when types do not match and one value is null/undefined', () => {
      let result = recursiveMerge([1], null);
      expect(result).toStrictEqual([1]);
      expect(() => recursiveMerge([1], 'test')).toThrow(/Cannot merge/);
      result = recursiveMerge([1], undefined);
      expect(result).toStrictEqual([1]);
    });
  });
});
