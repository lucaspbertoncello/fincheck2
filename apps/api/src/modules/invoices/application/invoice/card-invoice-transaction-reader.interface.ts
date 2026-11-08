import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the transactions of the cycle of a card. They count when they enter the accounts (not
// ignored, not removed by the bank without an edit), carry the invoice month and are not the
// payment of an invoice. The owner is `transactions`.
export interface CardInvoiceTransactionReader {
  // The sums by invoice month; a month without transaction is absent from the map.
  totalsByMonth(
    accountId: string,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, CardInvoiceTransactionReader.Totals>>;
  // The transactions of one invoice, in no particular order.
  itemsOf(
    accountId: string,
    month: Month,
    executor?: Kysely<Database>,
  ): Promise<CardInvoiceTransactionReader.Item[]>;
  // Every month the card has a transaction in (any of them, the ignored ones too).
  invoiceMonthsOf(accountId: string, executor?: Kysely<Database>): Promise<Month[]>;
}

export namespace CardInvoiceTransactionReader {
  export type Totals = {
    // Spending, `-amount`: a refund lowers it. The parcels of an installment plan apart.
    purchasesCents: number;
    installmentsCents: number;
    transactionCount: number;
  };

  export type Nature =
    | 'expense'
    | 'income'
    | 'transfer'
    | 'invoice_payment'
    | 'balance_adjustment'
    | 'lent'
    | 'reimbursed';

  export type Item = {
    transactionId: string;
    description: string;
    occurredOn: string;
    // With the sign of the transaction: a purchase is negative, a refund positive.
    amountCents: number;
    nature: Nature;
    categoryId: string | null;
    installment: { number: number; count: number } | null;
    // The parts of a split transaction (empty if it is not split); each carries the sign of the
    // transaction.
    parts: { categoryId: string | null; amountCents: number; nature: Nature }[];
  };
}
