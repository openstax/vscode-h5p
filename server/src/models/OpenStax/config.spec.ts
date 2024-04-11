import { recursiveMerge } from '../../utils';
import { yankByKeysFactory } from './AnswerYankers';
import Config, { newSupportedLibrary } from './config';

describe('questionSetYanker', () => {
  it('yanks private data by subtype', () => {
    const fakeContent = {
      questions: [
        {
          params: {
            question: '<p>Given point a and point b, what is 1+1?</p>\n',
            correct: false,
            isSolutionPublic: false,
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
            isSolutionPublic: true,
          },
          library: 'H5P.MultiChoice 1.16',
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
            detailedSolution: 'Something',
            isSolutionPublic: false,
          },
          library: 'H5P.MultiChoice 1.16',
        },
        {
          params: {
            taskDescription: 'Something',
            solution: {
              introduction: '',
              sample: '',
            },
            keywords: [
              {
                options: {
                  points: 1,
                  occurrences: 1,
                  caseSensitive: false,
                  forgiveMistakes: false,
                  feedbackIncludedWord: 'keyword',
                  feedbackMissedWord: 'none',
                },
                keyword: '*',
              },
            ],
            summarySolution: '',
            detailedSolution: '',
            isSolutionPublic: false,
          },
          library: 'H5P.Essay',
        },
      ],
    };
    const copy = JSON.parse(JSON.stringify(fakeContent));
    const questionSetYanker =
      Config.supportedLibraries['H5P.QuestionSet']?.yankAnswers;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [publicData, privateData] = questionSetYanker!(fakeContent);
    // No modifications to original
    expect(copy).toStrictEqual(fakeContent);
    expect(publicData).toMatchSnapshot();
    expect(privateData).toMatchSnapshot();
    expect(recursiveMerge(publicData, privateData)).toStrictEqual(fakeContent);
  });
});

describe('newSupportedLibrary', () => {
  it('combines library-specific and general answer yankers', () => {
    const fakeContent = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    // Test combination of additionalFields, privateKeys, and yankAnswers
    const testLib = newSupportedLibrary({
      yankAnswers: yankByKeysFactory('b', 'c'),
      semantics: {
        additionalFields: [
          { field: { name: 'a', type: 'text' }, private: true },
        ],
      },
      isSolutionPublic: () => true,
    });
    const [publicData, privateData] = testLib.yankAnswers(fakeContent);
    expect(publicData).toStrictEqual({ d: 4 });
    expect(privateData).toStrictEqual({ a: 1, b: 2, c: 3 });
  });
  it('Uses whichever answer yanker is defined', () => {
    const fakeContent = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    // Test combination of additionalFields, privateKeys, and yankAnswers
    const testLib = newSupportedLibrary({
      semantics: {
        additionalFields: [
          { field: { name: 'a', type: 'text' }, private: true },
        ],
      },
      isSolutionPublic: () => true,
    });
    let [publicData, privateData] = testLib.yankAnswers(fakeContent);
    expect(publicData).toStrictEqual({ b: 2, c: 3, d: 4 });
    expect(privateData).toStrictEqual({ a: 1 });
    const testLib2 = newSupportedLibrary({
      yankAnswers: yankByKeysFactory('a'),
      isSolutionPublic: () => true,
    });
    [publicData, privateData] = testLib2.yankAnswers(fakeContent);
    expect(publicData).toStrictEqual({ b: 2, c: 3, d: 4 });
    expect(privateData).toStrictEqual({ a: 1 });
  });
});

describe('questionSet Is Solution Public', () => {
  it('is true when all the included quesitons have public solutions', () => {
    const fakeContent = {
      questions: [
        {
          params: {
            isSolutionPublic: true,
          },
          library: 'H5P.TrueFalse 1.16',
        },
        {
          params: {
            isSolutionPublic: true,
          },
          library: 'H5P.MultiChoice 1.16',
        },
        {
          params: {
            isSolutionPublic: true,
          },
          library: 'H5P.Essay',
        },
      ],
    };
    expect(
      Config.supportedLibraries['H5P.QuestionSet']?.isSolutionPublic(
        fakeContent,
      ),
    ).toBe(true);
  });
});
