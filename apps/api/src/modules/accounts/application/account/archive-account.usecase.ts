import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The account leaves the screens and the choices, but its history keeps adding up in the past
// months. A Pluggy account archived is ignored by the sync (BR-ACC-008).
export class ArchiveAccountUseCase {
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

  async execute(input: ArchiveAccountUseCase.Input): Promise<ArchiveAccountUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.findById(input.accountId, executor);
      if (!account) throw new AccountNotFoundError();

      account.archive(this.clock.now());
      await this.accounts.save(account, executor);

      return this.presenter.presentOne(account, executor);
    });
  }
}

export namespace ArchiveAccountUseCase {
  export type Input = { accountId: string };
  export type Output = AccountContract.Dto;
}
