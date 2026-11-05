import { describe, expect, it } from 'vitest';

import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

describe('formatShortDate', () => {
  it('keeps the day and the month of a business date', () => {
    expect(formatShortDate('2026-10-07')).toBe('07/10');
    expect(formatShortDate('2026-12-31')).toBe('31/12');
  });
});
