// The day of the month (1 to 31) of a business date.
export function dayOf(date: string): number {
  return Number(date.slice(8, 10));
}
