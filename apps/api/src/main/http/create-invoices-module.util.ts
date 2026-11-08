import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { CountAccountInvoicesQuery } from '#/modules/invoices/application/account-deletion/count-account-invoices.query.ts';
import { DeleteAccountInvoicesUseCase } from '#/modules/invoices/application/account-deletion/delete-account-invoices.usecase.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import { GetInvoiceMonthQuery } from '#/modules/invoices/application/invoice/get-invoice-month.query.ts';
import { GetInvoiceQuery } from '#/modules/invoices/application/invoice/get-invoice.query.ts';
import { GetOpenInvoiceMonthsQuery } from '#/modules/invoices/application/invoice/get-open-invoice-months.query.ts';
import { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import { ListInvoicesQuery } from '#/modules/invoices/application/invoice/list-invoices.query.ts';
import { ListOpenInvoicesQuery } from '#/modules/invoices/application/invoice/list-open-invoices.query.ts';
import type { RecurrenceExpectationReader } from '#/modules/invoices/application/invoice/recurrence-expectation-reader.interface.ts';
import { UpdateInvoiceUseCase } from '#/modules/invoices/application/invoice/update-invoice.usecase.ts';
import { CreateInvoicePaymentUseCase } from '#/modules/invoices/application/invoice-payment/create-invoice-payment.usecase.ts';
import { DeleteInvoicePaymentUseCase } from '#/modules/invoices/application/invoice-payment/delete-invoice-payment.usecase.ts';
import { DismissPaymentSuggestionUseCase } from '#/modules/invoices/application/invoice-payment/dismiss-payment-suggestion.usecase.ts';
import { GetTransactionInvoiceLinksQuery } from '#/modules/invoices/application/invoice-payment/get-transaction-invoice-links.query.ts';
import type { InvoicePaymentCandidateReader } from '#/modules/invoices/application/invoice-payment/invoice-payment-candidate-reader.interface.ts';
import type { LinkInvoicePaymentTransaction } from '#/modules/invoices/application/invoice-payment/link-invoice-payment-transaction.interface.ts';
import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import { UndoPaymentSuggestionDismissalUseCase } from '#/modules/invoices/application/invoice-payment/undo-payment-suggestion-dismissal.usecase.ts';
import type { UnlinkInvoicePaymentTransaction } from '#/modules/invoices/application/invoice-payment/unlink-invoice-payment-transaction.interface.ts';
import { GetInvoiceController } from '#/modules/invoices/http/invoice/get-invoice.controller.ts';
import { createInvoiceRoute } from '#/modules/invoices/http/invoice/invoice.route.ts';
import { ListInvoicesController } from '#/modules/invoices/http/invoice/list-invoices.controller.ts';
import { ListOpenInvoicesController } from '#/modules/invoices/http/invoice/list-open-invoices.controller.ts';
import { UpdateInvoiceController } from '#/modules/invoices/http/invoice/update-invoice.controller.ts';
import { CreateInvoicePaymentController } from '#/modules/invoices/http/invoice-payment/create-invoice-payment.controller.ts';
import { DeleteInvoicePaymentController } from '#/modules/invoices/http/invoice-payment/delete-invoice-payment.controller.ts';
import { DismissPaymentSuggestionController } from '#/modules/invoices/http/invoice-payment/dismiss-payment-suggestion.controller.ts';
import { createInvoicePaymentRoute } from '#/modules/invoices/http/invoice-payment/invoice-payment.route.ts';
import { UndoPaymentSuggestionDismissalController } from '#/modules/invoices/http/invoice-payment/undo-payment-suggestion-dismissal.controller.ts';
import { KyselyInvoiceRepository } from '#/modules/invoices/infra/invoice/invoice.repository.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `invoices` module by hand: its routes and the readers `transactions` and `accounts`
// ask it for (the invoice month of a purchase, the open invoice of each card, the link of a
// payment, the count and the deletion of the invoices of a card). It asks three owners back:
// `accounts` (the cycle days of a card), `transactions` (the lines and sums of the cycle, the
// transactions that pay, the candidates of the payment found, and the use cases that link and
// unlink a payment) and, once it exists, `recurrences` (the occurrences still expected on a card).
// They come in as ports. The reader of `recurrences` is optional: without it no invoice has an
// expected recurrence (piece 6 plugs it in).
export function createInvoicesModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  cards: CardReader;
  transactionPorts: {
    cardTransactions: CardInvoiceTransactionReader;
    paymentTransactions: PaymentTransactionReader;
    paymentCandidates: InvoicePaymentCandidateReader;
    linkTransaction: LinkInvoicePaymentTransaction;
    unlinkTransaction: UnlinkInvoicePaymentTransaction;
  };
  expectations?: RecurrenceExpectationReader | undefined;
}) {
  const { db, unitOfWork, clock, cards, transactionPorts } = deps;
  const calendar = new BusinessCalendar();

  const invoices = new KyselyInvoiceRepository(db);
  const opener = new InvoiceOpener(invoices, calendar);
  const builder = new InvoiceDtoBuilder(
    invoices,
    transactionPorts.cardTransactions,
    transactionPorts.paymentTransactions,
    transactionPorts.paymentCandidates,
    deps.expectations,
    calendar,
    clock,
  );

  const routes = new Hono()
    .route(
      '/',
      createInvoiceRoute({
        listOpenInvoices: new ListOpenInvoicesController(
          new ListOpenInvoicesQuery(cards, invoices, transactionPorts.cardTransactions, builder),
        ),
        listInvoices: new ListInvoicesController(new ListInvoicesQuery(cards, builder)),
        getInvoice: new GetInvoiceController(new GetInvoiceQuery(cards, builder)),
        updateInvoice: new UpdateInvoiceController(
          new UpdateInvoiceUseCase(cards, invoices, opener, builder, unitOfWork, clock),
        ),
      }),
    )
    .route(
      '/',
      createInvoicePaymentRoute({
        createInvoicePayment: new CreateInvoicePaymentController(
          new CreateInvoicePaymentUseCase(
            cards,
            invoices,
            opener,
            transactionPorts.paymentTransactions,
            transactionPorts.linkTransaction,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        deleteInvoicePayment: new DeleteInvoicePaymentController(
          new DeleteInvoicePaymentUseCase(
            cards,
            invoices,
            transactionPorts.unlinkTransaction,
            unitOfWork,
            clock,
          ),
        ),
        dismissPaymentSuggestion: new DismissPaymentSuggestionController(
          new DismissPaymentSuggestionUseCase(
            cards,
            invoices,
            opener,
            transactionPorts.paymentTransactions,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        undoPaymentSuggestionDismissal: new UndoPaymentSuggestionDismissalController(
          new UndoPaymentSuggestionDismissalUseCase(
            cards,
            invoices,
            transactionPorts.paymentTransactions,
            builder,
            unitOfWork,
            clock,
          ),
        ),
      }),
    );

  return {
    routes,
    // The readers `transactions` declares and `invoices` fulfils.
    transactionReaders: {
      invoiceMonths: new GetInvoiceMonthQuery(cards),
      openInvoiceMonths: new GetOpenInvoiceMonthsQuery(cards, clock),
      links: new GetTransactionInvoiceLinksQuery(db),
    },
    // The ports `accounts` declares and `invoices` fulfils.
    accountPorts: {
      invoiceCounts: new CountAccountInvoicesQuery(invoices, transactionPorts.cardTransactions),
      deleteInvoices: new DeleteAccountInvoicesUseCase(
        invoices,
        transactionPorts.unlinkTransaction,
      ),
    },
  };
}
