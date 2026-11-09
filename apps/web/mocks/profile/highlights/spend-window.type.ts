import type { TransactionLine } from '#mocks/transactions/transaction/build-lines.util.ts';

// The last 12 calendar months up to today, as the spend heatmap draws them.
export interface SpendWindow {
  fromOn: string;
  untilOn: string;
  // Every day from `fromOn` to `untilOn`, in order.
  dates: string[];
  // Spending lines (expense nature) inside the window; `spentCents` is what was spent, so a refund is negative.
  lines: Array<TransactionLine & { spentCents: number }>;
  // What was spent each day, net: a refund lowers the day (it can end below zero); a day with
  // spending is one whose sum is above zero.
  spentByDay: Map<string, number>;
}
