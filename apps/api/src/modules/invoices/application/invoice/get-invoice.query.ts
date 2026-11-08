import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Ver fatura": the invoice of a month with its lines, the composition by category, the total of
// the month before and the highlights. Any valid month; after the open one it is a projection.
export class GetInvoiceQuery {
  private readonly cards: CardReader;
  private readonly builder: InvoiceDtoBuilder;

  constructor(cards: CardReader, builder: InvoiceDtoBuilder) {
    this.cards = cards;
    this.builder = builder;
  }

  async execute(input: GetInvoiceQuery.Input): Promise<GetInvoiceQuery.Output> {
    const card = await requireCard(this.cards, input.accountId);

    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');

    return this.builder.buildDetail(card, month);
  }
}

export namespace GetInvoiceQuery {
  export type Input = Invoice.Params;
  export type Output = Invoice.DetailDto;
}
