// Adds months to a month (`YYYY-MM`); negative goes back.
export function addMonths(month: string, months: number): string {
  const index = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + months;
  const year = Math.floor(index / 12);
  const monthNumber = (index % 12) + 1;

  return `${year}-${String(monthNumber).padStart(2, '0')}`;
}
