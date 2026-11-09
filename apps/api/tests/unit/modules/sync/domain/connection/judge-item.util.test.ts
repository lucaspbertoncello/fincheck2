import { describe, expect, it } from 'vitest';

import { judgeItem } from '#/modules/sync/domain/connection/judge-item.util.ts';

const NOW = '2026-11-09T15:00:00.000Z';
const ok = (lastUpdatedAt: string | null) => ({
  state: 'ok' as const,
  errorCode: null,
  lastUpdatedAt,
});

describe('judgeItem', () => {
  it.each(['CONSENT_REVOKED', 'LOGIN_ERROR', 'PROVIDER_ERROR'] as const)(
    'an error the Pluggy declared (%s) fails the round with that code',
    (errorCode) => {
      expect(
        judgeItem({ state: 'error', errorCode, lastUpdatedAt: '2026-11-09T13:00:00.000Z' }, NOW),
      ).toEqual({ type: 'failed', code: errorCode });
    },
  );

  it('an error with no code is a provider error', () => {
    expect(judgeItem({ state: 'error', errorCode: null, lastUpdatedAt: null }, NOW)).toEqual({
      type: 'failed',
      code: 'PROVIDER_ERROR',
    });
  });

  it('a bank still being read is `updating`: nothing to import now', () => {
    expect(judgeItem({ state: 'updating', errorCode: null, lastUpdatedAt: null }, NOW)).toEqual({
      type: 'updating',
    });
  });

  it('an item with no error and an update of two hours ago is fine', () => {
    expect(judgeItem(ok('2026-11-09T13:00:00.000Z'), NOW)).toEqual({ type: 'import' });
  });

  it('an item with no error and no update date is fine (it cannot be told old)', () => {
    expect(judgeItem(ok(null), NOW)).toEqual({ type: 'import' });
  });

  it('exactly 3 days without news is still fine; one second more is STALE_DATA', () => {
    expect(judgeItem(ok('2026-11-06T15:00:00.000Z'), NOW)).toEqual({ type: 'import' });
    expect(judgeItem(ok('2026-11-06T14:59:59.000Z'), NOW)).toEqual({
      type: 'failed',
      code: 'STALE_DATA',
    });
  });

  it('the declared error comes before the stale data', () => {
    expect(
      judgeItem(
        { state: 'error', errorCode: 'LOGIN_ERROR', lastUpdatedAt: '2026-10-01T00:00:00.000Z' },
        NOW,
      ),
    ).toEqual({ type: 'failed', code: 'LOGIN_ERROR' });
  });
});
