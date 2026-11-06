import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Edits name, bank and card data. The invoices that already exist keep their closing and due date:
// the change in `closingDay` and `dueDay` only reaches the ones not born yet.
export class UpdateAccountUseCase {
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

  async execute(input: UpdateAccountUseCase.Input): Promise<UpdateAccountUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.findById(input.accountId, executor);
      if (!account) throw new AccountNotFoundError();

      account.edit(input.changes, this.clock.now());
      await this.accounts.save(account, executor);

      return this.presenter.presentOne(account, executor);
    });
  }
}

export namespace UpdateAccountUseCase {
  export type Input = { accountId: string; changes: AccountContract.UpdateRequest };
  export type Output = AccountContract.Dto;
}
