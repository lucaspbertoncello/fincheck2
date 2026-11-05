import { shiftToBusinessDay } from '@fincheck/shared/common/date/shift-to-business-day.util.ts';

// The date itself when it is a business day (weekend and national holidays count), otherwise the next one.
export function nextBusinessDay(date: string): string {
  return shiftToBusinessDay(date, 'after');
}
