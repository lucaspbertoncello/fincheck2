import { describe, expect, it } from 'vitest';

import { formatMonthLong } from '#/shared/utils/format-month-long.util.ts';

describe('formatMonthLong', () => {
  it('writes the month by name, ready for a sentence', () => {
    expect(formatMonthLong('2026-12')).toBe('dezembro de 2026');
    expect(formatMonthLong('2027-03')).toBe('março de 2027');
  });
});
