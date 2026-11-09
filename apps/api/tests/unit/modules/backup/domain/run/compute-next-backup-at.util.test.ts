import { describe, expect, it } from 'vitest';

import { computeDailyBackupTime } from '#/modules/backup/domain/run/compute-daily-backup-time.util.ts';
import { computeNextBackupAt } from '#/modules/backup/domain/run/compute-next-backup-at.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

describe('computeDailyBackupTime', () => {
  it('is 03:00 in São Paulo, which is 06:00 UTC', () => {
    expect(computeDailyBackupTime(BusinessDate.of('2026-11-08'))).toBe('2026-11-08T06:00:00.000Z');
  });
});

describe('computeNextBackupAt', () => {
  const today = BusinessDate.of('2026-11-08');

  it('is tomorrow at 03:00 when today already has its backup', () => {
    expect(
      computeNextBackupAt({ now: '2026-11-08T15:00:00.000Z', today, hasBackupToday: true }),
    ).toBe('2026-11-09T06:00:00.000Z');
  });

  it('is today at 03:00 when it has not come yet', () => {
    expect(
      computeNextBackupAt({ now: '2026-11-08T05:59:59.000Z', today, hasBackupToday: false }),
    ).toBe('2026-11-08T06:00:00.000Z');
  });

  it('is now when 03:00 has passed and today has no backup (it runs as soon as it can)', () => {
    expect(
      computeNextBackupAt({ now: '2026-11-08T06:00:00.000Z', today, hasBackupToday: false }),
    ).toBe('2026-11-08T06:00:00.000Z');
    expect(
      computeNextBackupAt({ now: '2026-11-08T15:00:00.000Z', today, hasBackupToday: false }),
    ).toBe('2026-11-08T15:00:00.000Z');
  });

  it("is an hour after today's failure while that hour has not passed, then now again", () => {
    const lastErrorAt = '2026-11-08T12:00:00.000Z';
    const input = { today, hasBackupToday: false, lastErrorAt };

    expect(computeNextBackupAt({ ...input, now: '2026-11-08T12:10:00.000Z' })).toBe(
      '2026-11-08T13:00:00.000Z',
    );
    expect(computeNextBackupAt({ ...input, now: '2026-11-08T13:00:00.000Z' })).toBe(
      '2026-11-08T13:00:00.000Z',
    );
    // A failure from before today's 03:00 says nothing.
    expect(
      computeNextBackupAt({
        ...input,
        now: '2026-11-08T06:30:00.000Z',
        lastErrorAt: '2026-11-07T22:00:00.000Z',
      }),
    ).toBe('2026-11-08T06:30:00.000Z');
  });

  it('turns the month at the end of it', () => {
    expect(
      computeNextBackupAt({
        now: '2026-11-30T15:00:00.000Z',
        today: BusinessDate.of('2026-11-30'),
        hasBackupToday: true,
      }),
    ).toBe('2026-12-01T06:00:00.000Z');
  });
});
