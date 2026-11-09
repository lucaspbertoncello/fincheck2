// What a payment is worth now: a manual one is worth what was recorded; one tied to a transaction is
// worth `min(recorded, absolute amount of the transaction now)` while the transaction counts (not
// ignored, not removed by the bank without an edit, nature still expense, income or reimbursed),
// and nothing when it does not.
export function computePaymentCents(input: {
  recordedCents: number;
  transaction: { amountCents: number; nature: string; counts: boolean } | null | 'manual';
}): number {
  if (input.transaction === 'manual') return input.recordedCents;
  if (input.transaction === null) return 0;
  const { amountCents, nature, counts } = input.transaction;
  const countable = nature === 'expense' || nature === 'income' || nature === 'reimbursed';
  if (!counts || !countable) return 0;

  return Math.min(input.recordedCents, Math.abs(amountCents));
}
