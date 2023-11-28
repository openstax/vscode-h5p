import * as H5P from '@lumieducation/h5p-server';
import {
  IHubContentTypeWithLocalInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import OSH5PEditor, { alterLibrarySemantics, filterLibs } from './H5PEditor';
import Config from './config';

describe('H5PEditor', () => {
  describe('alterLibrarySemantics', () => {
    // https://docs.lumi.education/advanced-usage/customization#changing-the-semantics-of-individual-libraries
    // (Note: This function should be immutable...)
    it('does not mutate semantics', () => {
      const fakeLib: H5P.LibraryName = {
        machineName: 'Test',
        majorVersion: 0,
        minorVersion: 0,
      };
      const fakeSemantics: ISemanticsEntry[] = [
        {
          name: 'behaviour',
          type: 'group',
          fields: [
            {
              type: 'text',
              name: 'enableRetry',
              default: 'default',
            },
            {
              type: 'text',
              name: 'notEdited',
              default: 'default',
            },
            {
              type: 'text',
              name: 'otherValueThatIsEdited',
              default: 'default',
            },
          ],
        },
        {
          type: 'text',
          name: 'rootLevelProperty',
          default: 'default',
        },
        {
          name: '',
          type: 'group',
          fields: [
            {
              name: '',
              type: 'list',
              field: {
                type: 'text',
                widget: 'html',
                name: '',
                tags: [],
              },
            },
          ],
        },
      ];
      const fakeConfig = {
        supportedLibraries: {
          [fakeLib.machineName]: {
            semantics: {
              supportsHTML: true,
              overrides: {
                behaviour: {
                  enableRetry: {
                    default:
                      'This value should appear in the snapshot for enableRetry',
                  },
                  otherValueThatIsEdited: {
                    default:
                      'This value should appear in the snapshot for otherValueThatIsEdited',
                  },
                },
                rootLevelProperty: {
                  default:
                    'This value should appear in the snapshot for rootLevelProperty',
                },
              },
            },
          },
        },
      } as unknown as typeof Config;
      const serialized = JSON.stringify(fakeSemantics);
      const altered = alterLibrarySemantics(fakeLib, fakeSemantics, fakeConfig);
      expect(altered).toMatchSnapshot();
      // Does not modify the original
      expect(JSON.stringify(fakeSemantics)).toBe(serialized);
      // Does modify the clone
      expect(JSON.stringify(altered)).not.toBe(serialized);
    });
  });
  describe('H5PEditor class', () => {
    it('is created with the correct values', async () => {
      // Test inheritance and monkey patch
      new OSH5PEditor(
        jest.fn() as any,
        jest.fn() as any,
        jest.fn() as any,
        jest.fn() as any,
        jest.fn() as any,
        undefined,
        undefined
      );
    });
  });
  describe('filterLibs', () => {
    it('filters correctly', () => {
      const result = filterLibs(
        [
          { machineName: 'Test' },
          { machineName: 'Not returned' },
        ] as IHubContentTypeWithLocalInfo[],
        ['Test']
      );
      expect(result).toStrictEqual([{ machineName: 'Test' }]);
    });
    it('errors when a supported library is not found', () => {
      expect(() => {
        filterLibs([], ['Anything']);
      }).toThrow();
    });
  });
});
