import type { MonthSpendRow } from '#/components/charts/month-spend-row.type.ts';

/** Highest value across both series, in cents. */
export function maxOfRows(rows: readonly MonthSpendRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.current ?? 0, row.previous), 0);
}
