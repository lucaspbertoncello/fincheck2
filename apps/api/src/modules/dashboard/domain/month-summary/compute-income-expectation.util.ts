// What the month expects to receive (BR-DSH-011), the same number for the "Receitas" card and the
// "Receitas por fonte" of the categories:
//
//   expected = sum, over the income occurrences of the month, of the larger of what was expected
//              and what was received  +  the income of the month that no occurrence took in
//
// An occurrence that received more than it expected (a raise, an extra) counts what came, so the
// card never shows more received than expected; one that is skipped is not expected (the caller
// leaves it out). The income of the month that is not a payment of any of these occurrences (a
// Pix of no source, a bill to receive) adds the same to what was received and to what was
// expected: it was never promised, it only arrived. The result is also split by category: the
// occurrence in the category of its recurrence, the income in its own.
export function computeIncomeExpectation(input: {
  occurrences: ComputeIncomeExpectation.Occurrence[];
  // The income lines of the whole month (not only up to today).
  monthIncome: ComputeIncomeExpectation.Line[];
}): ComputeIncomeExpectation.Result {
  const paidByOccurrence = new Set(
    input.occurrences.flatMap((occurrence) => occurrence.paymentTransactionIds),
  );
  const byCategory = new Map<string | null, number>();
  const add = (categoryId: string | null, cents: number) =>
    byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + cents);

  for (const occurrence of input.occurrences) {
    add(occurrence.categoryId, Math.max(occurrence.expectedCents, occurrence.receivedCents));
  }
  for (const line of input.monthIncome) {
    if (!paidByOccurrence.has(line.transactionId)) add(line.categoryId, line.cents);
  }

  return {
    totalCents: [...byCategory.values()].reduce((total, cents) => total + cents, 0),
    byCategory,
  };
}

export namespace ComputeIncomeExpectation {
  export type Occurrence = {
    expectedCents: number;
    receivedCents: number;
    categoryId: string | null;
    paymentTransactionIds: string[];
  };

  export type Line = { transactionId: string; cents: number; categoryId: string | null };

  export type Result = {
    totalCents: number;
    byCategory: Map<string | null, number>;
  };
}
