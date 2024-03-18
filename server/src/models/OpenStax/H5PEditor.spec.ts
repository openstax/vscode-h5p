/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as H5P from '@lumieducation/h5p-server';
import {
  IHubContentTypeWithLocalInfo,
  ISemanticsEntry,
} from '@lumieducation/h5p-server/build/src/types';
import OSH5PEditor, { alterLibrarySemantics, filterLibs } from './H5PEditor';
import Config from './config';
import { walkJSON } from './ContentMutators';
import { createHash } from 'crypto';

describe('H5PEditor', () => {
  describe('alterLibrarySemantics', () => {
    const fakeLib: H5P.LibraryName = {
      machineName: 'Test',
      majorVersion: 0,
      minorVersion: 0,
    };
    const fakeSemantics: ISemanticsEntry[] = [
      {
        name: 'notmodified',
        type: 'group',
        default: 'default',
      },
    ];
    const semanticsWithBehavior = (behavior: ISemanticsEntry[]) => {
      return fakeSemantics.concat([
        {
          name: 'behaviour',
          type: 'group',
          label: 'Behavioural settings',
          importance: 'low',
          description:
            'These options will let you control how the task behaves.',
          optional: true,
          fields: behavior,
        },
      ]);
    };

    const blanksSemantics = semanticsWithBehavior([
      {
        type: 'boolean',
        name: 'caseSensitive',
        default: 'default',
      },
    ]);
    const multiChoiceSemantics = semanticsWithBehavior([
      {
        type: 'text',
        name: 'randomAnswers',
        default: 'default',
      },
    ]);
    const questionSetSemantics = fakeSemantics.concat([
      {
        type: 'text',
        name: 'questions',
        field: {
          name: 'question',
          type: 'library',
          options: ['H5P.MultiChoice 1.16', 'to be filtered out'],
        },
      },
      {
        type: 'boolean',
        name: 'randomQuestions',
        default: 'default',
      },
    ]);
    const pairs: Array<[H5P.LibraryName, ISemanticsEntry[]]> = [
      [{ ...fakeLib, machineName: 'H5P.Blanks' }, blanksSemantics],
      [{ ...fakeLib, machineName: 'H5P.MultiChoice' }, multiChoiceSemantics],
      [{ ...fakeLib, machineName: 'H5P.QuestionSet' }, questionSetSemantics],
    ];
    // https://docs.lumi.education/advanced-usage/customization#changing-the-semantics-of-individual-libraries
    // (Note: This function should be immutable...)
    pairs.forEach(([fakeLib, fakeSemantics]) => {
      it(`does not mutate semantics and alters the correct values (${fakeLib.machineName})`, () => {
        const serialized = JSON.stringify(fakeSemantics);
        const altered = alterLibrarySemantics(fakeLib, fakeSemantics);
        walkJSON(altered, (field) => {
          if (
            field.parent != null &&
            field.type === 'array' &&
            field.name === 'tags'
          ) {
            const value = field.value as string[];
            const hasher = createHash('sha1');
            hasher.update(value.join(''));
            Reflect.set(field.parent, field.name, [
              'REMOVED FOR BREVITY. SEE _supportedTags FOR FULL LIST',
            ]);
            Reflect.set(field.parent, 'tagsHash', hasher.digest('hex'));
          }
        });
        expect(altered).toMatchSnapshot();
        // Does not modify the original
        expect(JSON.stringify(fakeSemantics)).toBe(serialized);
        // Does modify the clone
        expect(JSON.stringify(altered)).not.toBe(serialized);
      });
    });
    const libWithHTML = Object.entries(Config.supportedLibraries).map(
      (t) => t[0],
    )[0];
    if (libWithHTML !== undefined) {
      it('adds tags', () => {
        const semanticsWithTags = blanksSemantics.concat([
          {
            name: 'tagParent',
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
        ]);
        const altered = alterLibrarySemantics(
          { ...fakeLib, machineName: libWithHTML },
          semanticsWithTags,
        );
        const entry = altered.find(
          (o: ISemanticsEntry) => o.name === 'tagParent',
        );
        const field = (entry?.fields ?? [])[0]?.field;
        expect(field).toBeDefined();
        expect(field?.tags?.length).toBeGreaterThan(0);
      });
    }
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
        undefined,
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
        ['Test'],
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
