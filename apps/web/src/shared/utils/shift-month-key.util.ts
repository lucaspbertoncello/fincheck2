/** Moves a `YYYY-MM` key by a number of months (negative goes back). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year = 0, month = 1] = monthKey.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}
