import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';

// How many invoices deleting the card takes away, to show before: every month the card has an
// invoice row or a transaction in (the invoice exists for the person even before a row is written).
// `accounts` asks it through its `AccountInvoicesReader`, which this class satisfies.
export class CountAccountInvoicesQuery {
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly cardTransactions: CardInvoiceTransactionReader;

  constructor(
    invoices: InvoiceRepository<Kysely<Database>>,
    cardTransactions: CardInvoiceTransactionReader,
  ) {
    this.invoices = invoices;
    this.cardTransactions = cardTransactions;
  }

  async countOf(accountId: string, executor?: Kysely<Database>): Promise<number> {
    const [rows, transactionMonths] = await Promise.all([
      this.invoices.findByAccount(accountId, executor),
      this.cardTransactions.invoiceMonthsOf(accountId, executor),
    ]);

    return new Set([
      ...rows.map((row) => row.month.value),
      ...transactionMonths.map((m) => m.value),
    ]).size;
  }
}
