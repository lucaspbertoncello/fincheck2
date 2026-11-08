import type { InvoicePayment } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import type { UnlinkInvoicePaymentTransaction } from '#/modules/invoices/application/invoice-payment/unlink-invoice-payment-transaction.interface.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { InvoicePaymentNotFoundError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-not-found.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desfazer" the payment of an invoice. The row of the invoice stays. The transaction that paid is
// given back by `transactions` in the same unit of work: if Lucas had turned it into a payment, it
// returns to expense or income by its sign; if the detector marked it, it stays a payment and is a
// suggestion again.
export class DeleteInvoicePaymentUseCase {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly unlinkTransaction: UnlinkInvoicePaymentTransaction;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    unlinkTransaction: UnlinkInvoicePaymentTransaction,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.unlinkTransaction = unlinkTransaction;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DeleteInvoicePaymentUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const card = await requireCard(this.cards, input.accountId, executor);
      const month = Month.of(input.month);
      assertSupportedMonth(month, 'month');
      const invoice = await this.invoices.findByAccountAndMonth(card.id, month, executor);
      if (!invoice) throw new InvoicePaymentNotFoundError();

      const payment = invoice.removePayment(input.paymentId, this.clock.now());
      await this.invoices.save(invoice, executor);
      if (payment.transactionId !== null) {
        await this.unlinkTransaction.execute(payment.transactionId, executor);
      }
    });
  }
}

export namespace DeleteInvoicePaymentUseCase {
  export type Input = InvoicePayment.Params;
}
