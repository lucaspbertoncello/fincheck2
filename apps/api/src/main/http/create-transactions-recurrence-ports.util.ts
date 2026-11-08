import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ApplyRecurrenceCategoryUseCase } from '#/modules/transactions/application/occurrence-payment/apply-recurrence-category.usecase.ts';
import { GetOccurrenceTransactionsQuery } from '#/modules/transactions/application/occurrence-payment/get-occurrence-transactions.query.ts';
import { ListSubscriptionChargesQuery } from '#/modules/transactions/application/subscription-charge/list-subscription-charges.query.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `recurrences` asks of `transactions`: what each transaction that settles an occurrence is
// worth, the ones a person may pick, the use case that puts the category of the recurrence on the
// transaction it settles, and the debits that may be the charge of a subscription. Built apart
// from `createTransactionsModule` because `transactions` also asks `recurrences` for readers (the
// link of an occurrence and the candidates of the queue): building these first breaks the circle.
export function createTransactionsRecurrencePorts(deps: { db: Kysely<Database>; clock: Clock }) {
  const transactions = new KyselyTransactionRepository(deps.db);

  return {
    occurrenceTransactions: new GetOccurrenceTransactionsQuery(deps.db),
    applyCategory: new ApplyRecurrenceCategoryUseCase(transactions, deps.clock),
    subscriptionCharges: new ListSubscriptionChargesQuery(deps.db),
  };
}
