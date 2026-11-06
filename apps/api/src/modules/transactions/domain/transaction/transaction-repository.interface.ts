import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';

// The port to the store of transactions: the root with its parts and tags. `Executor` is the
// database handle: pass the one of a unit of work to read and write inside it.
export interface TransactionRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Transaction | null>;
  // The ones that exist, in no particular order.
  findByIds(ids: string[], executor?: Executor): Promise<Transaction[]>;
  // All the parcels of the plans.
  findByInstallmentPlanIds(planIds: string[], executor?: Executor): Promise<Transaction[]>;
  // The transactions of other accounts that are the counterpart of a transfer leg of `accountId`.
  findTransferCounterpartsOfAccount(accountId: string, executor?: Executor): Promise<Transaction[]>;
  // Creates or updates the transaction, replacing its parts and its tags.
  save(transaction: Transaction, executor?: Executor): Promise<void>;
  delete(id: string, executor?: Executor): Promise<void>;
  // Deletes the installment plans and the transactions of an account (deleting the account).
  deleteByAccount(accountId: string, executor?: Executor): Promise<void>;
}
