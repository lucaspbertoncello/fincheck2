import { describe, expect, it } from 'vitest';

import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { formatPageDate } from '#/shared/utils/format-page-date.util.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';
import { getScreenByPathname } from '#/shared/utils/get-screen-by-pathname.util.ts';
import { getTimeOfDayIcon } from '#/shared/utils/get-time-of-day-icon.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

describe('month and date utils', () => {
  it('shifts a month across years', () => {
    expect(shiftMonthKey('2026-10', -1)).toBe('2026-09');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
  });

  it('formats the month label', () => {
    expect(formatMonthParts('2026-10')).toEqual({ monthLabel: 'Outubro', yearLabel: '2026' });
  });

  it('reads the month in the business time zone', () => {
    // 01:00 UTC on Nov 1st is still Oct 31st in São Paulo.
    expect(getCurrentMonthKey(new Date('2026-11-01T01:00:00Z'))).toBe('2026-10');
  });

  it('writes the page date with the weekday in full', () => {
    expect(formatPageDate(new Date('2026-10-22T15:00:00Z'))).toBe('Quinta-feira, 22 de outubro');
  });

  it('picks the icon of the hour', () => {
    expect(getTimeOfDayIcon(new Date('2026-10-22T15:00:00Z'))).toBe('sun');
    expect(getTimeOfDayIcon(new Date('2026-10-22T03:00:00Z'))).toBe('moon');
  });

  it('finds the deepest screen of a path', () => {
    expect(getScreenByPathname('/recurrences/bills').key).toBe('bills');
    expect(getScreenByPathname('/recurrences').key).toBe('recurrences');
    expect(getScreenByPathname('/').key).toBe('overview');
  });
});
