import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';

const TYPE_ORDER: AccountContract.Type[] = ['checking', 'savings', 'wallet', 'credit_card'];

// Inside the type, accounts are ordered by name with no difference for case or accent.
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// Accounts ordered by type (checking, savings, wallet, credit card) and then by name.
export class ListAccountsUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly presenter: AccountPresenter;

  constructor(accounts: AccountRepository<Kysely<Database>>, presenter: AccountPresenter) {
    this.accounts = accounts;
    this.presenter = presenter;
  }

  async execute(input: ListAccountsUseCase.Input): Promise<ListAccountsUseCase.Output> {
    const accounts = await this.accounts.list({ includeArchived: input.includeArchived });
    accounts.sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
        nameCollator.compare(a.name, b.name),
    );

    return { items: await this.presenter.present(accounts) };
  }
}

export namespace ListAccountsUseCase {
  export type Input = AccountContract.ListQuery;
  export type Output = { items: AccountContract.Dto[] };
}
