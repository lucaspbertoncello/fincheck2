/** X axis ticks: 1, 8, 15, 22 and the last day of the month (components.md 12.1). */
export function monthSpendXTicks(daysInMonth: number): number[] {
  return [...new Set([1, 8, 15, 22, daysInMonth])].filter((day) => day <= daysInMonth);
}
