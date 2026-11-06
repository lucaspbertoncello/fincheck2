// How many days a month has (`month` is 1 to 12). February follows the leap year.
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
