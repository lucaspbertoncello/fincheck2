import { isNationalHoliday } from '@fincheck/shared/common/date/is-national-holiday.util.ts';
import { weekdayOf } from '@fincheck/shared/common/date/weekday-of.util.ts';

/**
 * Why a fixed day moved, for the preview: "era domingo", "era sábado" or "era feriado". `dayOn` is
 * the day as the person wrote it (the 10th), before the shift. A weekend wins over a holiday on
 * the same day. Null when that day is a business day (nothing moved).
 */
export function buildShiftNote(dayOn: string): string | null {
  const weekday = weekdayOf(dayOn);
  if (weekday === 0) return 'era domingo';
  if (weekday === 6) return 'era sábado';

  return isNationalHoliday(dayOn) ? 'era feriado' : null;
}
