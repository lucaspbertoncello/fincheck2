// The number of days from 1970-01-01 to a date `YYYY-MM-DD`: only to measure the distance between
// two dates without building an object for each (the sync compares thousands of them). The text must
// already be a valid business date.
export function dayNumber(date: string): number {
  return Math.round(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) /
      86_400_000,
  );
}
