import { describe, expect, it } from 'vitest';

import { getHistoryProgress } from '#/domain/accounts/account/rules/get-history-progress.rule.ts';

describe('getHistoryProgress', () => {
  it('counts the months between the oldest transaction and today', () => {
    expect(getHistoryProgress('2026-02-14', '2026-10-30')).toEqual({
      monthsDone: 8,
      monthsTotal: 12,
    });
  });

  it('is zero before the first transaction arrives', () => {
    expect(getHistoryProgress(null, '2026-10-30').monthsDone).toBe(0);
  });

  it('stops at the 12 months window', () => {
    expect(getHistoryProgress('2024-01-01', '2026-10-30').monthsDone).toBe(12);
  });
});
