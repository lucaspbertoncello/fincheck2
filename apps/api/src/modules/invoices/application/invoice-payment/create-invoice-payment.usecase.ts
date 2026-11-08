import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InvoicePayment } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import type { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import type { LinkInvoicePaymentTransaction } from '#/modules/invoices/application/invoice-payment/link-invoice-payment-transaction.interface.ts';
import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import { computeInvoicePhase } from '#/modules/invoices/domain/invoice/compute-invoice-phase.util.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { assertTransactionCanPay } from '#/modules/invoices/domain/invoice-payment/assert-transaction-can-pay.util.ts';
import { InvoicePaymentTransactionAlreadyLinkedError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-transaction-already-linked.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Registrar pagamento" and the "Vincular" of the payment found: total or partial, by hand or tied
// to a transaction. It may pass what is left (the invoice is then paid, I4). With a transaction it
// checks that it can pay, and, in the same unit of work, `transactions` turns it into an invoice
// payment (nature `invoice_payment`, set by Lucas). The row of the invoice is born here if needed.
// The order of the errors: card and transaction that do not exist (404), the invoice not payable,
// the transaction invalid (422), the transaction already linked (409).
export class CreateInvoicePaymentUseCase {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly opener: InvoiceOpener;
  private readonly transactions: PaymentTransactionReader;
  private readonly linkTransaction: LinkInvoicePaymentTransaction;
  private readonly builder: InvoiceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    opener: InvoiceOpener,
    transactions: PaymentTransactionReader,
    linkTransaction: LinkInvoicePaymentTransaction,
    builder: InvoiceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.opener = opener;
    this.transactions = transactions;
    this.linkTransaction = linkTransaction;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: CreateInvoicePaymentUseCase.Input,
  ): Promise<CreateInvoicePaymentUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const card = await requireCard(this.cards, input.accountId, executor);
      const month = Month.of(input.month);
      assertSupportedMonth(month, 'month');
      const amount = Money.fromCents(input.amountCents);
      const transaction =
        input.transactionId === undefined
          ? null
          : await this.transactions.requireOne(input.transactionId, executor);

      const invoice = await this.opener.loadOrOpen(card, month, now, executor);
      invoice.registerPayment(
        { amount, paidOn: BusinessDate.of(input.paidOn), transactionId: transaction?.id ?? null },
        computeInvoicePhase(month, this.builder.openMonthOf(card)),
        now,
      );

      if (transaction) {
        assertTransactionCanPay({
          transaction: {
            accountId: transaction.accountId,
            amount: Money.fromCents(transaction.amountCents),
            nature: transaction.nature,
            isSplit: transaction.isSplit,
            counts: transaction.counts,
          },
          cardAccountId: card.id,
          amount,
        });
        const linked = await this.invoices.findLinkedTransactionIds([transaction.id], executor);
        if (linked.has(transaction.id)) throw new InvoicePaymentTransactionAlreadyLinkedError();
      }

      await this.invoices.save(invoice, executor);
      if (transaction) await this.linkTransaction.execute(transaction.id, executor);

      const [dto] = await this.builder.buildMany(card, [month], executor);
      if (!dto) throw new RangeError('The invoice was not built');

      return dto;
    });
  }
}

export namespace CreateInvoicePaymentUseCase {
  export type Input = Pick<Invoice.Params, 'accountId' | 'month'> & InvoicePayment.CreateRequest;
  export type Output = Invoice.Dto;
}
