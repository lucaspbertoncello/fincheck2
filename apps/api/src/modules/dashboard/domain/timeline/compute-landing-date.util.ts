import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The day of the projection an item that counts in the Livre falls on (BR-DSH-008): its own day;
// today when it is already late or its day passed; the last day of the month when it has no day or
// falls due after the month (an invoice that closes on the 30th and falls due on the 6th). So all
// of it lands between today and the last day and the last day closes at the Livre.
export function computeLandingDate(
  dueOn: string | null,
  today: BusinessDate,
  lastDay: BusinessDate,
): string {
  if (dueOn === null || dueOn > lastDay.value) return lastDay.value;
  if (dueOn < today.value) return today.value;

  return dueOn;
}
