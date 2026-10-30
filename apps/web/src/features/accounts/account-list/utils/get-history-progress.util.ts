const WINDOW_MONTHS = 12;

/**
 * "8 of about 12 months": how many months of history the first sync has brought, from the date of
 * the oldest transaction to today. Nothing yet counts as zero.
 */
export function getHistoryProgress(
  fromOn: string | null,
  today: string,
): { monthsDone: number; monthsTotal: number } {
  if (!fromOn) return { monthsDone: 0, monthsTotal: WINDOW_MONTHS };
  const [fromYear = 0, fromMonth = 1] = fromOn.split('-').map(Number);
  const [year = 0, month = 1] = today.split('-').map(Number);
  const months = (year - fromYear) * 12 + (month - fromMonth);
  return { monthsDone: Math.min(WINDOW_MONTHS, Math.max(0, months)), monthsTotal: WINDOW_MONTHS };
}
