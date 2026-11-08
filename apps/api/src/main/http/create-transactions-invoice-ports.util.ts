import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { GetCardInvoiceTransactionsQuery } from '#/modules/transactions/application/card-invoice/get-card-invoice-transactions.query.ts';
import { GetInvoicePaymentTransactionsQuery } from '#/modules/transactions/application/invoice-payment/get-invoice-payment-transactions.query.ts';
import { LinkInvoicePaymentUseCase } from '#/modules/transactions/application/invoice-payment/link-invoice-payment.usecase.ts';
import { ListInvoicePaymentCandidatesQuery } from '#/modules/transactions/application/invoice-payment/list-invoice-payment-candidates.query.ts';
import { UnlinkInvoicePaymentUseCase } from '#/modules/transactions/application/invoice-payment/unlink-invoice-payment.usecase.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `invoices` asks of `transactions`: the sums and the lines of the cycle of a card, the
// transactions that pay an invoice, the candidates of the "Pagamento encontrado", and the use cases
// that turn a transaction into the payment of an invoice and give it back. They are built apart
// from `createTransactionsModule` because `transactions` also asks `invoices` for readers: building
// these first breaks the circle (neither module imports the other).
export function createTransactionsInvoicePorts(deps: {
  db: Kysely<Database>;
  accounts: TransactionAccountReader;
  clock: Clock;
}) {
  const transactions = new KyselyTransactionRepository(deps.db);

  return {
    cardTransactions: new GetCardInvoiceTransactionsQuery(deps.db),
    paymentTransactions: new GetInvoicePaymentTransactionsQuery(deps.db),
    paymentCandidates: new ListInvoicePaymentCandidatesQuery(deps.db),
    linkTransaction: new LinkInvoicePaymentUseCase(transactions, deps.clock),
    unlinkTransaction: new UnlinkInvoicePaymentUseCase(transactions, deps.accounts, deps.clock),
  };
}
