import { describe, expect, it } from 'vitest';

import { getCycleProgress } from '#/domain/invoices/invoice/rules/get-cycle-progress.rule.ts';

describe('getCycleProgress', () => {
  it('is 0 on the day the cycle opens and 1 on the closing day', () => {
    expect(getCycleProgress('2026-10-30', '2026-09-30')).toBe(0);
    expect(getCycleProgress('2026-10-30', '2026-10-30')).toBe(1);
  });

  it('is about half way in the middle of the cycle', () => {
    expect(getCycleProgress('2026-10-30', '2026-10-15')).toBeCloseTo(0.5, 1);
  });

  it('stays inside 0 and 1 when today is outside the cycle', () => {
    expect(getCycleProgress('2026-10-30', '2026-08-01')).toBe(0);
    expect(getCycleProgress('2026-10-30', '2026-11-20')).toBe(1);
  });
});
