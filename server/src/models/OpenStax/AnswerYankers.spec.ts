import { recursiveMerge } from '../../utils';
import {
  Yanker,
  blanksYanker,
  multiChoiceYanker,
  shallowMerge,
  trueFalseYanker,
} from './AnswerYankers';
import Config from './config';

describe('AnswerYankers', () => {
  const yankByKeyTests: Array<[string, Yanker, string]> = [
    ['blanksYanker', blanksYanker, 'questions'],
    ['multiChoiceYanker', multiChoiceYanker, 'answers'],
    ['trueFalseYanker', trueFalseYanker, 'correct'],
  ];
  yankByKeyTests.forEach(([name, func, key]) => {
    describe(name, () => {
      it(`yanks ${key} without side effects`, () => {
        // The actual information does not matter
        // We are testing that it pulls out the correct key without side effects
        const fakeContent = {
          [key]: {},
          otherInformation: {},
        };
        const copy = { ...fakeContent };
        const [publicData, privateData] = func(fakeContent);
        // Did not modify original
        expect(copy).toStrictEqual(fakeContent);
        // Removed if from public
        expect(key in (publicData as any)).toBe(false);
        expect('otherInformation' in (publicData as any)).toBe(true);
        // Saves it in private
        expect(key in (privateData as any)).toBe(true);
        expect('otherInformation' in (privateData as any)).toBe(false);

        // Merge them back together
        expect(shallowMerge(publicData, privateData)).toStrictEqual(
          fakeContent,
        );
      });
    });
  });
  describe('questionSetYanker', () => {
    it('yanks private data by subtype', () => {
      const fakeContent = {
        questions: [
          {
            params: {
              question: '<p>Given point a and point b, what is 1+1?</p>\n',
              correct: false,
            },
            library: 'H5P.TrueFalse 1.16',
          },
          {
            params: {
              question: '<p>Given point a and point b, what is 2+2?</p>\n',
              answers: [
                {
                  correct: false,
                  tipsAndFeedback: {
                    tip: '',
                    chosenFeedback: '',
                    notChosenFeedback: '',
                  },
                  text: '<div>3</div>\n',
                },
                {
                  correct: true,
                  tipsAndFeedback: {
                    tip: '',
                    chosenFeedback: '',
                    notChosenFeedback: '',
                  },
                  text: '<div>4</div>\n',
                },
              ],
            },
            library: 'H5P.MultiChoice 1.16',
          },
          {
            params: {
              media: {
                disableImageZooming: false,
              },
              questions: ['<p>What is *true*?</p>\n'],
            },
            library: 'H5P.Blanks 1.14',
          },
        ],
      };
      const copy = { ...fakeContent };
      const questionSetYanker =
        Config.supportedLibraries['H5P.QuestionSet']?.yankAnswers;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [publicData, privateData] = questionSetYanker!(fakeContent);
      // No modifications to original
      expect(copy).toStrictEqual(fakeContent);
      expect(publicData).toMatchSnapshot();
      expect(privateData).toMatchSnapshot();
      expect(recursiveMerge(publicData, privateData)).toStrictEqual(
        fakeContent,
      );
    });
  });
});
