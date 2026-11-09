import { computeDailyBackupTime } from '#/modules/backup/domain/run/compute-daily-backup-time.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const RETRY_EVERY_MS = 3_600_000;

// When the daily task runs next: tomorrow at 03:00 when today already has its file; otherwise
// today at 03:00, or `now` when that time has passed (it runs as soon as the API can). After a
// failure today (`lastErrorAt`) the task tries again an hour later, so that is the next time while
// the hour has not passed.
export function computeNextBackupAt(input: {
  now: string;
  today: BusinessDate;
  hasBackupToday: boolean;
  lastErrorAt?: string | null;
}): string {
  if (input.hasBackupToday) return computeDailyBackupTime(input.today.addDays(1));
  const due = computeDailyBackupTime(input.today);
  if (Date.parse(input.now) < Date.parse(due)) return due;

  if (input.lastErrorAt) {
    const failedAt = Date.parse(input.lastErrorAt);
    const retryAt = failedAt + RETRY_EVERY_MS;
    if (failedAt >= Date.parse(due) && retryAt > Date.parse(input.now)) {
      return new Date(retryAt).toISOString();
    }
  }

  return input.now;
}
