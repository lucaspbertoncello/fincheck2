import { BillOriginTransactionInvalidError } from '#/modules/bills/domain/bill/bill-origin-transaction-invalid.error.ts';

// "Você pagou": the origin is a debit of nature `expense`, whole, that counts.
export function assertTransactionCanBeOrigin(input: {
  // With sign.
  amountCents: number;
  nature: string;
  counts: boolean;
  isSplit: boolean;
}): void {
  if (input.amountCents >= 0 || input.nature !== 'expense' || !input.counts || input.isSplit) {
    throw new BillOriginTransactionInvalidError();
  }
}
