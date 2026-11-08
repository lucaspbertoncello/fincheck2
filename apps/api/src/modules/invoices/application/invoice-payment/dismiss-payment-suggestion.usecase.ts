import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import type { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Não é este" of the payment found: the transaction stops being a candidate for this invoice, and
// the suggestion does not come back when it is opened again (the next candidate, if any, shows). The
// row of the invoice is born here if needed. Answers the invoice already without the suggestion.
export class DismissPaymentSuggestionUseCase {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly opener: InvoiceOpener;
  private readonly transactions: PaymentTransactionReader;
  private readonly builder: InvoiceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    opener: InvoiceOpener,
    transactions: PaymentTransactionReader,
    builder: InvoiceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.opener = opener;
    this.transactions = transactions;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: DismissPaymentSuggestionUseCase.Input,
  ): Promise<DismissPaymentSuggestionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const card = await requireCard(this.cards, input.accountId, executor);
      const month = Month.of(input.month);
      assertSupportedMonth(month, 'month');
      await this.transactions.requireOne(input.transactionId, executor);

      const invoice = await this.opener.loadOrOpen(card, month, now, executor);
      invoice.dismissPaymentSuggestion(input.transactionId, now);
      await this.invoices.save(invoice, executor);

      const [dto] = await this.builder.buildMany(card, [month], executor);
      if (!dto) throw new RangeError('The invoice was not built');

      return dto;
    });
  }
}

export namespace DismissPaymentSuggestionUseCase {
  export type Input = Invoice.Params & PaymentSuggestion.DismissRequest;
  export type Output = Invoice.Dto;
}
