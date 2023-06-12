import { chunk, collect, range } from '../utils';

describe('utils', () => {
  describe('collect', () => {
    it('returns an array from iterable', () => {
      expect(collect([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
  describe('range', () => {
    const args: [number, number | undefined, number[]][] = [
      [1, 3, [1, 2]],
      [3, undefined, [0, 1, 2]],
    ];
    args.map(([a, b, expected]) => {
      it(`returns ${JSON.stringify(expected)} for range ${a} to ${b}`, () => {
        expect(collect(range(a, b))).toEqual(expected);
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
        expected
      )} for ${arr} chunked to ${chunkSize} chunk size`, () => {
        expect(chunk(arr, chunkSize)).toEqual(expected);
      });
    });
  });
});
