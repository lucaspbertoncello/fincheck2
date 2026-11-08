import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions that pay an invoice: what the payment is worth today and whether the
// transaction can pay. The owner is `transactions`.
export interface PaymentTransactionReader {
  // The ones that exist, by id.
  findMany(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, PaymentTransactionReader.Snapshot>>;
  // Throws `TRANSACTION_NOT_FOUND` (the error of the owner) when there is none.
  requireOne(
    transactionId: string,
    executor?: Kysely<Database>,
  ): Promise<PaymentTransactionReader.Snapshot>;
}

export namespace PaymentTransactionReader {
  export type Snapshot = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    nature:
      | 'expense'
      | 'income'
      | 'transfer'
      | 'invoice_payment'
      | 'balance_adjustment'
      | 'lent'
      | 'reimbursed';
    isSplit: boolean;
    // Not ignored and not removed by the bank without an edit: only then does it settle anything.
    counts: boolean;
  };
}
