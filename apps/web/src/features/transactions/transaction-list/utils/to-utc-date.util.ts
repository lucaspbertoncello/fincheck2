/** A business date (`YYYY-MM-DD`) as midnight UTC, so no time zone moves the day. */
export function toUtcDate(businessDate: string): Date {
  const [year = 0, month = 1, day = 1] = businessDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
