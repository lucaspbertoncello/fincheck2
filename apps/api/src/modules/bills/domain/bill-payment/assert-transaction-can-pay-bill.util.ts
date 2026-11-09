import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import { BillPaymentTransactionInvalidError } from '#/modules/bills/domain/bill-payment/bill-payment-transaction-invalid.error.ts';

// A payable bill takes a debit of nature `expense`, a receivable one a credit of nature `income`,
// and only a transaction that counts and is whole (a split one would hide the parts).
export function assertTransactionCanPayBill(input: {
  direction: Bill.Direction;
  // With sign.
  amountCents: number;
  nature: string;
  counts: boolean;
  isSplit: boolean;
}): void {
  const rightWay =
    input.direction === 'receivable'
      ? input.amountCents > 0 && input.nature === 'income'
      : input.amountCents < 0 && input.nature === 'expense';

  if (!rightWay || !input.counts || input.isSplit) throw new BillPaymentTransactionInvalidError();
}
