import { describe, expect, it } from 'vitest';

import { convertAmountToCents } from '#/modules/sync/infra/pluggy/convert-amount-to-cents.util.ts';

describe('convertAmountToCents', () => {
  it.each([
    [10.1, 1010],
    [0.29, 29],
    [1234.56, 123456],
    [1.005, 100],
    [0.1 + 0.2, 30],
    [19.99, 1999],
    [0, 0],
    [-0, 0],
    [-10.1, -1010],
    [-0.29, -29],
    [1e6, 100000000],
  ])('%s is %s cents', (amount, expected) => {
    expect(convertAmountToCents(amount)).toBe(expected);
  });

  it.each([[null], [undefined], ['10.5'], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rejects %s',
    (amount) => {
      expect(() => convertAmountToCents(amount)).toThrow(TypeError);
    },
  );
});
