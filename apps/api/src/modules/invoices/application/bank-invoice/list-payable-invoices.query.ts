import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How many closed months before the open one are looked at: a debit pays an invoice between its
// closing and five days after its due date, so an older invoice no longer fits any new debit.
const MONTHS_BACK = 4;

// The invoices still to pay that the detector of invoice payments of the import compares a debit
// to (`domain model.md` 4.10, detector 2 (b)): closed, partial or overdue, of the active cards,
// with the total that counts. A month is looked at when it has a row or a transaction. The sync asks
// it through its own port, which this class satisfies.
export class ListPayableInvoicesQuery {
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

  async execute(executor?: Kysely<Database>): Promise<ListPayableInvoicesQuery.Invoice[]> {
    const found: ListPayableInvoicesQuery.Invoice[] = [];

    for (const card of await this.cards.listActiveCards(executor)) {
      const openMonth = this.builder.openMonthOf(card);
      let oldest = openMonth;
      for (let step = 0; step < MONTHS_BACK; step++) oldest = oldest.previous();
      const [rows, transactionMonths] = await Promise.all([
        this.invoices.findByAccount(card.id, executor),
        this.cardTransactions.invoiceMonthsOf(card.id, executor),
      ]);
      const months = [
        ...new Set([
          ...rows.map((row) => row.month.value),
          ...transactionMonths.map((month) => month.value),
        ]),
      ]
        .filter((month) => month < openMonth.value && month >= oldest.value)
        .toSorted()
        .map((month) => Month.of(month));

      for (const invoice of await this.builder.buildMany(card, months, executor)) {
        if (
          invoice.status !== 'closed' &&
          invoice.status !== 'partial' &&
          invoice.status !== 'overdue'
        ) {
          continue;
        }
        found.push({
          accountId: card.id,
          closesOn: invoice.closesOn,
          dueOn: invoice.dueOn,
          totalCents: invoice.totalCents,
        });
      }
    }

    return found;
  }
}

export namespace ListPayableInvoicesQuery {
  export type Invoice = {
    accountId: string;
    closesOn: string;
    dueOn: string;
    totalCents: number;
  };
}
