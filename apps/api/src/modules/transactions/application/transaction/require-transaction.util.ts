import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';

// The transaction, or `TRANSACTION_NOT_FOUND`.
export async function requireTransaction(
  transactions: TransactionRepository<Kysely<Database>>,
  id: string,
  executor: Kysely<Database>,
): Promise<Transaction> {
  const transaction = await transactions.findById(id, executor);
  if (!transaction) throw new TransactionNotFoundError();

  return transaction;
}
