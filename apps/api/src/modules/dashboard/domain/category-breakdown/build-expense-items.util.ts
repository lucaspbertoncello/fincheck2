import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import { roundPct } from '#/modules/dashboard/domain/month-comparison/round-pct.util.ts';

const LATEST = 3;

// The spending by category (BR-DSH-005): one item per category that has a line in the period,
// "Sem categoria" (null) being one more, and the last. Spending is `-amount` of the lines, so a
// refund lowers it. Biggest first. `previous` are the lines of the period before (null over all
// the history, where there is no comparison and those fields are null). `sharePct` is the share
// of the total, null when the total is not positive and 0 for a category whose refund was bigger
// than its spending (never negative; its `spentCents` keeps the sign, so the sum of the items is
// still the total).
export function buildExpenseItems(input: {
  current: BuildExpenseItems.Line[];
  previous: BuildExpenseItems.Line[] | null;
}): BuildExpenseItems.Result {
  const spentBy = (lines: BuildExpenseItems.Line[]) => {
    const byCategory = new Map<string | null, number>();
    for (const line of lines) {
      byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) - line.amountCents);
    }

    return byCategory;
  };
  const currentSpent = spentBy(input.current);
  const previousSpent = input.previous ? spentBy(input.previous) : null;
  const totalCents = [...currentSpent.values()].reduce((total, cents) => total + cents, 0);

  const items = [...currentSpent.entries()].map(([categoryId, spentCents]) => {
    const mine = input.current.filter((line) => line.categoryId === categoryId);
    const before = previousSpent ? (previousSpent.get(categoryId) ?? 0) : null;
    const changeCents = before === null ? null : spentCents - before;

    return {
      categoryId,
      spentCents,
      previousSpentCents: before,
      changeCents,
      changePct: changeCents === null || before === null ? null : roundPct(changeCents, before),
      sharePct: spentCents > 0 ? roundPct(spentCents, totalCents) : roundPct(0, totalCents),
      transactionCount: new Set(mine.map((line) => line.transactionId)).size,
      latest: mine
        .toSorted(
          (a, b) =>
            b.occurredOn.localeCompare(a.occurredOn) ||
            a.transactionId.localeCompare(b.transactionId),
        )
        .slice(0, LATEST)
        .map((line) => ({
          transactionId: line.transactionId,
          description: line.description,
          occurredOn: line.occurredOn,
          amountCents: line.amountCents,
        })),
    };
  });
  items.sort(
    (a, b) =>
      Number(a.categoryId === null) - Number(b.categoryId === null) ||
      b.spentCents - a.spentCents ||
      (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
  );

  return {
    totalCents,
    previousTotalCents: previousSpent
      ? [...previousSpent.values()].reduce((total, cents) => total + cents, 0)
      : null,
    items,
  };
}

export namespace BuildExpenseItems {
  export type Line = {
    transactionId: string;
    description: string;
    occurredOn: string;
    // With the sign of the transaction: an expense is negative, a refund positive.
    amountCents: number;
    categoryId: string | null;
  };

  export type Result = {
    totalCents: number;
    previousTotalCents: number | null;
    items: CategoryBreakdown.ExpenseItem[];
  };
}
