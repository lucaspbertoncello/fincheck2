import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { listLookbackMonths } from '#/modules/invoices/application/invoice/list-lookback-months.util.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const STATUSES_STILL_TO_PAY: Invoice.Status[] = ['open', 'closed', 'partial', 'overdue'];

// The invoices `dashboard` puts in the Livre and in the agenda. `listUnpaid`: every invoice of an
// active card that is not paid, whatever its due date (BR-DSH-003): the open one, the closed one,
// the partial and the overdue, in the open month and in the three before it (the oldest with a row
// or a transaction). `ListOpenInvoicesQuery` gives only one per card, which would drop the open
// invoice while an older one is still waiting. `listSettledIn`: the invoices paid, whose last
// payment is in the month ("Quitadas em outubro"). `dashboard` asks it through its
// `AgendaInvoiceReader`, which this class satisfies.
export class ListAgendaInvoicesQuery {
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

  async listUnpaid(): Promise<Invoice.OpenItem[]> {
    const items: Invoice.OpenItem[] = [];

    for (const card of await this.cards.listActiveCards()) {
      const openMonth = this.builder.openMonthOf(card);
      const [rows, transactionMonths] = await Promise.all([
        this.invoices.findByAccount(card.id),
        this.cardTransactions.invoiceMonthsOf(card.id),
      ]);
      const months = [
        ...listLookbackMonths(openMonth, [
          ...rows.map((row) => row.month.value),
          ...transactionMonths.map((month) => month.value),
        ]),
        openMonth,
      ];

      for (const invoice of await this.builder.buildMany(card, months)) {
        if (STATUSES_STILL_TO_PAY.includes(invoice.status)) {
          items.push({ accountId: card.id, invoice });
        }
      }
    }

    return items;
  }

  async listSettledIn(month: string): Promise<Invoice.OpenItem[]> {
    const wanted = Month.of(month);
    // An invoice is paid in its own month or in one of the next three (it closes on one day and
    // falls due on another, and one paid late stays open as long as `listUnpaid` looks back), or a
    // month before (paid before it closes).
    const first = wanted.previous().previous().previous();
    const last = wanted.next();
    const items: Invoice.OpenItem[] = [];

    for (const card of await this.cards.listActiveCards()) {
      const rows = (await this.invoices.findByAccount(card.id)).filter(
        (row) => row.month.value >= first.value && row.month.value <= last.value,
      );
      if (rows.length === 0) continue;

      const invoices = await this.builder.buildMany(
        card,
        rows.map((row) => row.month).toSorted((a, b) => a.value.localeCompare(b.value)),
      );
      for (const invoice of invoices) {
        if (
          invoice.status === 'paid' &&
          ListAgendaInvoicesQuery.lastPaymentMonth(invoice) === month
        ) {
          items.push({ accountId: card.id, invoice });
        }
      }
    }

    return items;
  }

  private static lastPaymentMonth(invoice: Invoice.Dto): string | null {
    const last = invoice.payments
      .map((payment) => payment.paidOn)
      .toSorted()
      .at(-1);

    return last ? last.slice(0, 7) : null;
  }
}
