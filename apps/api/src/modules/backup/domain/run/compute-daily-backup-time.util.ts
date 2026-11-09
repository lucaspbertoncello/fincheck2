import { BACKUP_DAILY_HOUR } from '#/modules/backup/domain/run/backup-schedule.constant.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { instantOfBusinessTime } from '#/shared/date/instant-of-business-time.util.ts';

// The instant the daily backup of `day` is due: 03:00 in São Paulo.
export function computeDailyBackupTime(day: BusinessDate): string {
  return instantOfBusinessTime({
    year: day.year,
    month: day.monthNumber,
    day: day.day,
    hour: BACKUP_DAILY_HOUR,
    minute: 0,
    second: 0,
  });
}
