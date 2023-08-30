import mockfs from 'mock-fs';
import {
  download,
  downloadLibraries,
  extractArchive,
  getIps,
  parseBooksXML,
} from './utils';
import fsExtra from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
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

function setupMockfs(fsImpl) {
  // Required to avoid jest buffered messages (which fails with mock fs)
  console.log = jest.fn();
  console.debug = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();

  mockfs(fsImpl);
}

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
      await extractArchive('/myzip.zip', testPath, true, ['/test/a.txt']);
      const result = dirToObj(testPath);
      mockfs.restore();
      expect(result).toMatchSnapshot();
    });
    it('extracts all files', async () => {
      await extractArchive('/myzip.zip', testPath, true);
      const result = dirToObj(testPath);
      mockfs.restore();
      expect(result).toMatchSnapshot();
    });
  });
  describe('downloadLibrarires', () => {
    let mockFetch: jest.Mock;
    beforeEach(() => {
      mockFetch = fetch as unknown as jest.Mock;
      mockFetch.mockResolvedValue({
        async json() {
          return {
            libraries: [
              { installed: false, isUpToDate: false, machineName: 'Test.A' },
              { installed: true, isUpToDate: false, machineName: 'Test.B' },
              { installed: true, isUpToDate: true, machineName: 'Test.C' },
            ],
          };
        },
      });
    });
    it('installs the correct libraries', async () => {
      const mockInstall = jest.fn().mockResolvedValue(null);
      const mockEditor = {
        installLibraryFromHub: mockInstall,
      } as any;
      const testHost = 'my-test-hostname';
      const testPort = 12345;
      const testUrl = '/testing';
      await downloadLibraries(testHost, testPort, testUrl, mockEditor);
      expect(mockFetch).toBeCalledWith('http://my-test-hostname:12345/testing');
      expect(mockInstall.mock.calls).toMatchSnapshot();
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
  describe('download', () => {
    const downloadsDir = '/Downloads';
    let mockFetch: jest.Mock;

    beforeEach(() => {
      mockFetch = fetch as unknown as jest.Mock;
      mockFetch.mockResolvedValue({
        body: {
          pipe(outputStream) {
            outputStream.write('Something');
            outputStream.end();
          },
          on: jest.fn(),
        },
      });
      setupMockfs({
        [downloadsDir]: {},
      });
    });

    afterEach(() => {
      mockfs.restore();
    });

    it('downloads files to the correct location', async () => {
      const testUrl = 'http://localhost/test-url';
      const destPath = path.join(downloadsDir, 'test.txt');
      await download(testUrl, destPath);
      const result = dirToObj(downloadsDir);
      mockfs.restore();
      expect(mockFetch).toBeCalledWith(testUrl);
      expect(result).toMatchSnapshot();
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
});
