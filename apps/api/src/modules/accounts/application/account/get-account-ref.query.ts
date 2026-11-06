import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';

// What other contexts need to know of an account to put something in it: whether it is a card and
// whether it is archived. `transactions` asks it through its `TransactionAccountReader`, which
// this query satisfies. Throws `ACCOUNT_NOT_FOUND`.
export class GetAccountRefQuery {
  private readonly accounts: AccountRepository<Kysely<Database>>;

  constructor(accounts: AccountRepository<Kysely<Database>>) {
    this.accounts = accounts;
  }

  async requireAccount(
    accountId: string,
    executor?: Kysely<Database>,
  ): Promise<{ id: string; isCard: boolean; isArchived: boolean }> {
    const account = await this.accounts.findById(accountId, executor);
    if (!account) throw new AccountNotFoundError();

    return { id: account.id, isCard: account.isCard(), isArchived: account.isArchived() };
  }
}
