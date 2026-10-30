import { describe, expect, it } from 'vitest';

import { formatSyncAge } from '#/features/accounts/account-list/utils/format-sync-age.util.ts';

const now = new Date('2026-10-30T12:00:00.000Z');

describe('formatSyncAge', () => {
  it.each([
    ['2026-10-30T11:59:40.000Z', 'agora'],
    ['2026-10-30T11:48:00.000Z', 'há 12 min'],
    ['2026-10-30T09:00:00.000Z', 'há 3 h'],
    ['2026-10-29T06:00:00.000Z', 'ontem'],
    ['2026-10-25T12:00:00.000Z', 'há 5 dias'],
  ])('says how long ago %s was', (updatedAt, expected) => {
    expect(formatSyncAge(updatedAt, now)).toBe(expected);
  });

  it('never goes negative when the clock is a little behind the bank', () => {
    expect(formatSyncAge('2026-10-30T12:05:00.000Z', now)).toBe('agora');
  });
});
