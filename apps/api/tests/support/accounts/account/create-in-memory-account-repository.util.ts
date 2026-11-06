import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';

// The repository port over a `Map`, for the unit tests of the use cases.
export function createInMemoryAccountRepository(
  initial: Account[] = [],
): AccountRepository<Kysely<Database>> & { stored: Map<string, Account> } {
  const stored = new Map(initial.map((account) => [account.id, account]));

  return {
    stored,
    async findById(id) {
      return stored.get(id) ?? null;
    },
    async list({ includeArchived }) {
      return [...stored.values()].filter((account) => includeArchived || !account.isArchived());
    },
    async save(account) {
      stored.set(account.id, account);
    },
    async delete(id) {
      stored.delete(id);
    },
  };
}
