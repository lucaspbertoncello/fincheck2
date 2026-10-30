import { describe, expect, it } from 'vitest';

import { formatDayChip } from '#/features/transactions/transaction-list/utils/format-day-chip.util.ts';

describe('formatDayChip', () => {
  it('writes the day first', () => {
    expect(formatDayChip('2026-10-12')).toBe('12/10');
  });
});
