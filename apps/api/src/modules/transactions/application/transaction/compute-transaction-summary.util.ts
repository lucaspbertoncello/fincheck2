// The totals of the month by competence, from the lines that enter the accounts (BR-TRX-006).
// Pure: no database, to be tested by invariant.
//
// - Spending: the sum of `-amount` of the `expense` lines (a refund, positive, lowers it). A split
//   transaction counts by its parts.
// - Income: the sum of the `income` lines.
// - Outside: the absolute value of what is neither spending nor income: `balance_adjustment`,
//   `lent`, `reimbursed` and, in a split, the `lent` and `reimbursed` parts. In `transfer` and
//   `invoice_payment` only the leg that leaves counts (amount < 0), so the same money is not
//   counted twice (N3).
// - Review: how many are in review, and the sum of their absolute values.
export function computeTransactionSummary(
  transactions: {
    nature:
      | 'expense'
      | 'income'
      | 'transfer'
      | 'invoice_payment'
      | 'balance_adjustment'
      | 'lent'
      | 'reimbursed';
    // With sign.
    amountCents: number;
    isInReview: boolean;
    splits: { nature: 'expense' | 'income' | 'lent' | 'reimbursed'; amountCents: number }[];
  }[],
): {
  expensesCents: number;
  incomesCents: number;
  outsideCents: number;
  reviewCount: number;
  reviewTotalCents: number;
} {
  let expensesCents = 0;
  let incomesCents = 0;
  let outsideCents = 0;
  let reviewCount = 0;
  let reviewTotalCents = 0;

  for (const transaction of transactions) {
    if (transaction.isInReview) {
      reviewCount += 1;
      reviewTotalCents += Math.abs(transaction.amountCents);
    }

    if (transaction.splits.length > 0) {
      for (const part of transaction.splits) {
        if (part.nature === 'expense') expensesCents -= part.amountCents;
        else if (part.nature === 'income') incomesCents += part.amountCents;
        else outsideCents += Math.abs(part.amountCents);
      }
      continue;
    }

    if (transaction.nature === 'expense') expensesCents -= transaction.amountCents;
    else if (transaction.nature === 'income') incomesCents += transaction.amountCents;
    else if (
      (transaction.nature === 'transfer' || transaction.nature === 'invoice_payment') &&
      transaction.amountCents > 0
    ) {
      continue;
    } else outsideCents += Math.abs(transaction.amountCents);
  }

  return { expensesCents, incomesCents, outsideCents, reviewCount, reviewTotalCents };
}
