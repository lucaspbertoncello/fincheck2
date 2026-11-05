/** A positive amount is money in (income, refund); zero and below is money out. */
export function getTransactionDirection(amountCents: number): 'income' | 'expense' {
  return amountCents > 0 ? 'income' : 'expense';
}
