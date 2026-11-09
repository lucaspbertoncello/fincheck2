import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { TransactionLine } from '#mocks/transactions/transaction/build-lines.util.ts';

// What the month expects to receive, the same number for the "Receitas" card and the "Receitas por
// fonte": per income occurrence the larger of what was expected and what was received, plus the
// income of the month (by competence, the whole month) that no occurrence took in. The category
// split follows: the occurrence in the category of its recurrence, the income in its own.
export function computeIncomeExpectation(
  occurrences: Occurrence.Dto[],
  lines: TransactionLine[],
  month: string,
  categoryOfOccurrence: (occurrence: Occurrence.Dto) => string | null = () => null,
): { totalCents: number; byCategory: Map<string | null, number> } {
  const paidByOccurrence = new Set(
    occurrences.flatMap((occurrence) =>
      occurrence.payments.map((payment) => payment.transactionId),
    ),
  );
  const byCategory = new Map<string | null, number>();
  const add = (categoryId: string | null, cents: number) =>
    byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + cents);

  for (const occurrence of occurrences) {
    add(
      categoryOfOccurrence(occurrence),
      Math.max(occurrence.expectedAmountCents, occurrence.receivedCents),
    );
  }
  for (const line of lines) {
    if (line.nature !== 'income' || line.competenceOn.slice(0, 7) !== month) continue;
    if (!paidByOccurrence.has(line.transactionId)) add(line.categoryId, line.amountCents);
  }

  return {
    totalCents: [...byCategory.values()].reduce((total, cents) => total + cents, 0),
    byCategory,
  };
}
