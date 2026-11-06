import { describe, expect, it } from 'vitest';

import { describeUpdateTime } from '#/shared/layouts/application/summary/utils/describe-update-time.util.ts';

const NOW = new Date('2026-10-30T15:00:00-03:00');

describe('describeUpdateTime', () => {
  it.each([
    ['2026-10-30T14:48:00-03:00', 'Sincronizado há 12 min'],
    ['2026-10-30T11:00:00-03:00', 'Sincronizado há 4 h'],
    ['2026-10-29T18:40:00-03:00', 'Ontem, 18:40'],
    ['2026-10-27T09:05:00-03:00', '27/10, 09:05'],
    [null, 'Ainda sem atualização'],
  ])('%s -> %s', (updatedAt, expected) => {
    expect(describeUpdateTime(updatedAt, NOW)).toBe(expected);
  });
});
