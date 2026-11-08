import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import { assertMonthRange } from '#/modules/invoices/application/invoice/assert-month-range.util.ts';
import { buildMonthRange } from '#/modules/invoices/application/invoice/build-month-range.util.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The invoices of a card, every month of the range even with no row and no purchase (the front does
// not fill the gaps), oldest first; the months after the open one are projections (RF-INV-003).
// Default range: two months before the open invoice to three after it.
export class ListInvoicesQuery {
  private readonly cards: CardReader;
  private readonly builder: InvoiceDtoBuilder;

  constructor(cards: CardReader, builder: InvoiceDtoBuilder) {
    this.cards = cards;
    this.builder = builder;
  }

  async execute(input: ListInvoicesQuery.Input): Promise<ListInvoicesQuery.Output> {
    const card = await requireCard(this.cards, input.accountId);
    const openMonth = this.builder.openMonthOf(card);
    const from = input.from ? Month.of(input.from) : openMonth.previous().previous();
    const to = input.to ? Month.of(input.to) : openMonth.next().next().next();
    // The side that did not come takes its default, and then the range is checked like the one
    // that came whole (from not after to, at most 24 months), inside the years the API accepts.
    assertSupportedMonth(from, 'from');
    assertSupportedMonth(to, 'to');
    assertMonthRange(from, to);

    return { items: await this.builder.buildMany(card, buildMonthRange(from, to)) };
  }
}

export namespace ListInvoicesQuery {
  export type Input = { accountId: string } & Invoice.ListQuery;
  export type Output = { items: Invoice.Dto[] };
}
