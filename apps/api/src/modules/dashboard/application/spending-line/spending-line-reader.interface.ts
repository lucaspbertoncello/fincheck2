// Port to the lines of spending and income by competence (BR-DSH-001): what enters the accounts,
// the natures `expense` and `income` only, a split transaction by its parts, an installment on the
// day of the purchase in the month of its invoice. The owner is `transactions`.
export interface SpendingLineReader {
  // Between two days, both ends included (either may be left out); only a kind; only a category.
  listLines(input: {
    from?: string;
    to?: string;
    kind?: 'expense' | 'income';
    categoryId?: string;
  }): Promise<SpendingLineReader.Line[]>;
}

export namespace SpendingLineReader {
  export type Line = {
    transactionId: string;
    description: string;
    // The day of the transaction.
    occurredOn: string;
    // The day it counts, by competence.
    on: string;
    kind: 'expense' | 'income';
    // With the sign of the transaction (an expense is negative, a refund positive).
    amountCents: number;
    categoryId: string | null;
  };
}
