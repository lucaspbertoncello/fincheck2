import { describe, expect, it } from 'vitest';

import { getReceivedPercent } from '#/domain/dashboard/month-summary/rules/get-received-percent.rule.ts';

describe('getReceivedPercent', () => {
  it('rounds received over expected to a whole percent', () => {
    expect(getReceivedPercent(380200, 842700)).toBe(45);
    expect(getReceivedPercent(900000, 842700)).toBe(107);
  });

  it('is 0 when nothing is expected', () => {
    expect(getReceivedPercent(100, 0)).toBe(0);
  });
});
