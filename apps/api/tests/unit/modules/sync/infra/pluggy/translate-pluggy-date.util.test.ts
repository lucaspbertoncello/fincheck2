import { describe, expect, it } from 'vitest';

import { translatePluggyDate } from '#/modules/sync/infra/pluggy/translate-pluggy-date.util.ts';

describe('translatePluggyDate', () => {
  it.each([
    // Midnight UTC is a day without hour: the day is the text, not the day of Sao Paulo.
    ['2026-10-01T00:00:00.000Z', '2026-10-01'],
    ['2026-10-01T00:00:00Z', '2026-10-01'],
    ['2026-01-01T00:00:00.000Z', '2026-01-01'],
    // Any other hour is an instant: the day it falls on in America/Sao_Paulo (UTC-3).
    ['2026-10-01T02:30:00.000Z', '2026-09-30'],
    ['2026-10-01T02:59:59.000Z', '2026-09-30'],
    ['2026-10-01T03:00:00.000Z', '2026-10-01'],
    ['2026-10-01T00:00:00.001Z', '2026-09-30'],
    // 23:59 in Sao Paulo is 02:59 UTC of the next day.
    ['2026-10-02T02:59:00.000Z', '2026-10-01'],
    ['2026-10-01T14:00:00.000Z', '2026-10-01'],
    ['2026-10-01T15:30:00-03:00', '2026-10-01'],
    // A date with no hour is itself.
    ['2026-10-01', '2026-10-01'],
    // No zone is read as UTC, not as the zone of the PC.
    ['2026-10-01T02:30:00', '2026-09-30'],
  ])('%s becomes %s', (input, expected) => {
    expect(translatePluggyDate(input)).toBe(expected);
  });

  it.each([[undefined], [null], [''], ['not a date'], [20261001]])('%s is not a date', (input) => {
    expect(translatePluggyDate(input)).toBeNull();
  });
});
