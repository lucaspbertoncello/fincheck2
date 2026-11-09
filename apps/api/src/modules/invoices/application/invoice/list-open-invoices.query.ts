import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { listLookbackMonths } from '#/modules/invoices/application/invoice/list-lookback-months.util.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';

// The invoice of each active card that asks for attention (BR-DSH-009): the oldest one still to
// pay (closed, partial or overdue) if there is any, otherwise the open one. Ordered by due date,
// then by card. The months looked at are the ones with a row or a transaction, in the three months
// before the open one.
export class ListOpenInvoicesQuery {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly cardTransactions: CardInvoiceTransactionReader;
  private readonly builder: InvoiceDtoBuilder;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    cardTransactions: CardInvoiceTransactionReader,
    builder: InvoiceDtoBuilder,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.cardTransactions = cardTransactions;
    this.builder = builder;
  }

  async execute(): Promise<ListOpenInvoicesQuery.Output> {
    const cards = await this.cards.listActiveCards();
    const items: Invoice.OpenItem[] = [];

    for (const card of cards) {
      const openMonth = this.builder.openMonthOf(card);
      const [rows, transactionMonths] = await Promise.all([
        this.invoices.findByAccount(card.id),
        this.cardTransactions.invoiceMonthsOf(card.id),
      ]);
      // Only the last three months before the open one (see `listLookbackMonths`).
      const before = listLookbackMonths(openMonth, [
        ...rows.map((row) => row.month.value),
        ...transactionMonths.map((month) => month.value),
      ]);

      const oldest = await this.builder.findOldestUnpaidMonth(card, before);
      const [invoice] = await this.builder.buildMany(card, [oldest ?? openMonth]);
      if (invoice) items.push({ accountId: card.id, invoice });
    }

    return {
      items: items.toSorted(
        (a, b) =>
          a.invoice.dueOn.localeCompare(b.invoice.dueOn) || a.accountId.localeCompare(b.accountId),
      ),
    };
  }
}

export namespace ListOpenInvoicesQuery {
  export type Output = { items: Invoice.OpenItem[] };
}
