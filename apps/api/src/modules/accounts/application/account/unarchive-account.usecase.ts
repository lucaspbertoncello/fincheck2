import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The inverse of archiving.
export class UnarchiveAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly presenter: AccountPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    presenter: AccountPresenter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnarchiveAccountUseCase.Input): Promise<UnarchiveAccountUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.findById(input.accountId, executor);
      if (!account) throw new AccountNotFoundError();

      account.unarchive(this.clock.now());
      await this.accounts.save(account, executor);

      return this.presenter.presentOne(account, executor);
    });
  }
}

export namespace UnarchiveAccountUseCase {
  export type Input = { accountId: string };
  export type Output = AccountContract.Dto;
}
