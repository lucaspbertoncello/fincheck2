import type { Account } from '#/modules/accounts/domain/account/account.entity.ts';

// The port to the accounts' store. Only for the root of the aggregate: the card data travels with
// the account. `Executor` is the database handle; pass the one of a unit of work to write inside it,
// or leave it out to use the default connection.
export interface AccountRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Account | null>;
  list(options: { includeArchived: boolean }, executor?: Executor): Promise<Account[]>;
  // Creates or updates the account and its card data.
  save(account: Account, executor?: Executor): Promise<void>;
  // Deletes the account and its card data. The owners of the transactions, invoices and rules must
  // have deleted theirs first.
  delete(id: string, executor?: Executor): Promise<void>;
}
