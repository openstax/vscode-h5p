import { recursiveMerge } from '../../utils';
import { yankByKeysFactory } from './AnswerYankers';

describe('AnswerYankers', () => {
  describe('yankByKeysFactory', () => {
    it('yanks without side effects', () => {
      const key = 'anything-you-want';
      const func = yankByKeysFactory(key);
      // The actual information does not matter
      // We are testing that it pulls out the correct key without side effects
      const publicPart = {
        otherInformation: {},
      };
      const privatePart = {
        [key]: {},
      };
      const fakeContent = {
        ...publicPart,
        ...privatePart,
      };
      const copy = JSON.parse(JSON.stringify(fakeContent));
      const [publicData, privateData] = func(fakeContent);
      // Did not modify original
      expect(fakeContent).toStrictEqual(copy);
      // Removed if from public
      expect(publicData).toStrictEqual(publicPart);
      // Saves it in private
      expect(privateData).toStrictEqual(privatePart);
      // Merge them back together
      expect(recursiveMerge(publicData, privateData)).toStrictEqual(
        fakeContent,
      );
    });
  });
});
