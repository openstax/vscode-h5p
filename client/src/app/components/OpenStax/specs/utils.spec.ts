import { range, chunk, debounce } from '../../../../../../common/src/utils';

describe('utils', () => {
  describe('range', () => {
    const args: [number, number | undefined, number[]][] = [
      [1, 3, [1, 2]],
      [3, undefined, [0, 1, 2]],
    ];
    args.map(([a, b, expected]) => {
      it(`returns ${JSON.stringify(expected)} for range ${a} to ${b}`, () => {
        expect(range(a, b)).toEqual(expected);
      });
    });
  });
  describe('chunk', () => {
    const args: [number[], number, number[][]][] = [
      [[1, 2, 3, 4], 1, [[1], [2], [3], [4]]],
      [
        [1, 2, 3, 4],
        2,
        [
          [1, 2],
          [3, 4],
        ],
      ],
      [[1, 2, 3, 4], 3, [[1, 2, 3], [4]]],
    ];
    args.map(([arr, chunkSize, expected]) => {
      it(`returns ${JSON.stringify(
        expected,
      )} for ${arr} chunked to ${chunkSize} chunk size`, () => {
        expect(chunk(arr, chunkSize)).toEqual(expected);
      });
    });
  });
  describe('debounce', () => {
    it('calls the function the correct number of times', async () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 500);
      void debounced(undefined);
      await debounced(undefined);
      expect(mockFn).toBeCalledTimes(1);
    });
  });
});
