import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { BillTransactionEffects } from '#/modules/transactions/application/bill-payment/bill-transaction-effects.service.ts';
import { GetBillTransactionsQuery } from '#/modules/transactions/application/bill-payment/get-bill-transactions.query.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `bills` asks of `transactions`: what each transaction that pays (or originates) a bill is
// worth and the ones to pick from, and the effects of a bill on a transaction (the friend part
// `lent`, the money back `reimbursed`, the category of the bill). Built apart from
// `createTransactionsModule` because `transactions` also asks `bills` for its link: building these
// first breaks the circle.
export function createTransactionsBillPorts(deps: { db: Kysely<Database>; clock: Clock }) {
  return {
    billTransactions: new GetBillTransactionsQuery(deps.db),
    billEffects: new BillTransactionEffects(new KyselyTransactionRepository(deps.db), deps.clock),
  };
}
