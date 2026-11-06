import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';

// Answers for an archived account too.
export class GetAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly presenter: AccountPresenter;

  constructor(accounts: AccountRepository<Kysely<Database>>, presenter: AccountPresenter) {
    this.accounts = accounts;
    this.presenter = presenter;
  }

  async execute(input: GetAccountUseCase.Input): Promise<GetAccountUseCase.Output> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new AccountNotFoundError();

    return this.presenter.presentOne(account);
  }
}

export namespace GetAccountUseCase {
  export type Input = { accountId: string };
  export type Output = AccountContract.Dto;
}
