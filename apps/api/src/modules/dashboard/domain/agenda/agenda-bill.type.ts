import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

// A bill with the transaction that most likely paid it and has no link yet (the presumed payment),
// as `bills` hands it over.
export type AgendaBill = {
  bill: Bill.Dto;
  presumed: {
    transactionId: string;
    accountId: string;
    // With sign.
    amountCents: number;
    occurredOn: string;
    description: string;
  } | null;
};
