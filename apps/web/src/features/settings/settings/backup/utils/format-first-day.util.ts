/** "2025-11-03" becomes "03/11/2025": the day the data starts, as written in Brazil. */
export function formatFirstDay(businessDate: string): string {
  const [year, month, day] = businessDate.split('-');
  return `${day}/${month}/${year}`;
}
