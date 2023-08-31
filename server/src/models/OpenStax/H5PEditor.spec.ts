import * as H5P from '@lumieducation/h5p-server';
import { ISemanticsEntry } from '@lumieducation/h5p-server/build/src/types';
import { alterLibrarySemantics } from './H5PEditor';
import Config from './config';

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
            default: 'true',
          },
        ],
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
            supportsMath: true,
            behaviourOverrides: {
              enableRetry: {
                default: false,
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
