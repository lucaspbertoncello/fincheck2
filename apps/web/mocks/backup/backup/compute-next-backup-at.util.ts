import { addDays } from '#mocks/support/dates/add-days.util.ts';

const RETRY_EVERY_MS = 3_600_000;

// 03:00 in São Paulo (UTC-3, no daylight saving) of a business date.
const dailyBackupTime = (day: string) => `${day}T06:00:00.000Z`;

// When the daily task runs next: tomorrow at 03:00 when today already has its file; otherwise today
// at 03:00, or now when that time has passed. After a failure today the task tries again an hour
// later, so that is the next time while the hour has not passed.
export function computeNextBackupAt(input: {
  now: string;
  today: string;
  hasBackupToday: boolean;
  lastErrorAt: string | null;
}): string {
  if (input.hasBackupToday) return dailyBackupTime(addDays(input.today, 1));
  const due = dailyBackupTime(input.today);
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
