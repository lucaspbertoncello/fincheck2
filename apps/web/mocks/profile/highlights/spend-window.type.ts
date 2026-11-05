import type { TransactionLine } from '#mocks/transactions/transaction/build-lines.util.ts';

// The last 12 calendar months up to today, as the spend heatmap draws them.
export interface SpendWindow {
  fromOn: string;
  untilOn: string;
  // Every day from `fromOn` to `untilOn`, in order.
  dates: string[];
  // Spending lines (expense nature) inside the window; `spentCents` is what was spent, so a refund is negative.
  lines: Array<TransactionLine & { spentCents: number }>;
  // What was spent each day, never below zero (a refund does not make a day negative).
  spentByDay: Map<string, number>;
}
