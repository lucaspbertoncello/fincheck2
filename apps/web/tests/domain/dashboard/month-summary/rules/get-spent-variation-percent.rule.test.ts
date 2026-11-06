import { describe, expect, it } from 'vitest';

import { getSpentVariationPercent } from '#/domain/dashboard/month-summary/rules/get-spent-variation-percent.rule.ts';

describe('getSpentVariationPercent', () => {
  it('is positive when spending rose and negative when it fell', () => {
    expect(getSpentVariationPercent(348620, 317275)).toBeCloseTo(9.88, 2);
    expect(getSpentVariationPercent(100, 200)).toBe(-50);
  });

  it('is null when the previous month had nothing at the same point', () => {
    expect(getSpentVariationPercent(100, 0)).toBeNull();
  });
});
