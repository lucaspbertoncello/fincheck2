import { describe, expect, it } from 'vitest';

import { computeHighlightWindow } from '#/modules/profile/application/highlight/compute-highlight-window.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const date = (value: string) => BusinessDate.of(value);

describe('computeHighlightWindow', () => {
  it('goes from the first day of the month 12 months back to today', () => {
    const window = computeHighlightWindow(date('2026-11-08'));

    expect(window.from.value).toBe('2025-12-01');
    expect(window.to.value).toBe('2026-11-08');
  });

  it('works from a short month and across a leap year', () => {
    expect(computeHighlightWindow(date('2028-02-29')).from.value).toBe('2027-03-01');
    expect(computeHighlightWindow(date('2026-01-31')).from.value).toBe('2025-02-01');
  });
});
