import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import type { ComputeIncomeExpectation } from '#/modules/dashboard/domain/month-summary/compute-income-expectation.util.ts';

// The income by source (BR-DSH-007): one item per category that received something in the period
// or expects something of the month, biggest expectation first. `received` is the income lines of
// the period; `expectation` the split of `computeIncomeExpectation`, and `occurrences` the income
// occurrences of the month that are not skipped, whose pending ones (what is left to receive)
// show as "Mesada, falta 1 Pix". Without a month there is no expectation: only what came in.
export function buildIncomeItems(input: {
  received: { transactionId: string; cents: number; categoryId: string | null }[];
  expectation: ComputeIncomeExpectation.Result | null;
  occurrences: AgendaOccurrence[];
}): CategoryBreakdown.IncomeItem[] {
  const receivedBy = new Map<string | null, { cents: number; transactions: Set<string> }>();
  for (const line of input.received) {
    const entry = receivedBy.get(line.categoryId) ?? { cents: 0, transactions: new Set<string>() };
    entry.cents += line.cents;
    entry.transactions.add(line.transactionId);
    receivedBy.set(line.categoryId, entry);
  }

  const categories = new Set<string | null>([
    ...receivedBy.keys(),
    ...(input.expectation?.byCategory.keys() ?? []),
  ]);

  return [...categories]
    .map((categoryId) => ({
      categoryId,
      receivedCents: receivedBy.get(categoryId)?.cents ?? 0,
      expectedCents: input.expectation?.byCategory.get(categoryId) ?? 0,
      transactionCount: receivedBy.get(categoryId)?.transactions.size ?? 0,
      pending: input.occurrences
        .filter(
          (occurrence) =>
            occurrence.categoryId === categoryId &&
            occurrence.remainingCents > 0 &&
            occurrence.status !== 'confirmed' &&
            occurrence.status !== 'skipped',
        )
        .map((occurrence) => ({
          occurrenceId: occurrence.id,
          recurrenceName: occurrence.recurrenceName,
          remainingCents: occurrence.remainingCents,
          expectedOn: occurrence.expectedOn,
          status: occurrence.status,
        })),
    }))
    .toSorted(
      (a, b) =>
        b.expectedCents - a.expectedCents ||
        b.receivedCents - a.receivedCents ||
        (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
    );
}
