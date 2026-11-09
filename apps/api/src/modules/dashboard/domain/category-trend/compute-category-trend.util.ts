import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import type { Month } from '#/shared/date/month.value-object.ts';

const MONTHS = 12;

// The 12 months of a category up to `until`, oldest first, the bars of its page (BR-CAT-010). The
// lines are the ones of that category by competence, with the sign of the transaction. An expense
// category adds what was spent (`-amount`, a refund lowers it), an income category what was
// received. A month with no movement comes with 0, and so does one where the refund was bigger
// than the spending (the bar is never negative); `transactionCount` counts transactions, not
// parts of a split one.
export function computeCategoryTrend(input: {
  until: Month;
  kind: 'expense' | 'income';
  lines: { transactionId: string; on: string; amountCents: number }[];
}): CategoryBreakdown.TrendMonth[] {
  const months: Month[] = [];
  for (let month = input.until, count = 0; count < MONTHS; month = month.previous(), count++) {
    months.unshift(month);
  }

  return months.map((month) => {
    const mine = input.lines.filter((line) => line.on.slice(0, 7) === month.value);
    const sum = mine.reduce((total, line) => total + line.amountCents, 0);
    const total = input.kind === 'expense' ? -sum : sum;

    return {
      month: month.value,
      totalCents: total > 0 ? total : 0,
      transactionCount: new Set(mine.map((line) => line.transactionId)).size,
    };
  });
}
