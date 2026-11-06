import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import type { CreateBalanceAdjustment } from '#/modules/accounts/application/account/create-balance-adjustment.interface.ts';
import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Creates a manual account, wallet or manual card. A non-zero initial balance is the first balance
// adjustment, recorded by `transactions` in the same unit of work (BR-ACC-006).
export class CreateAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly balanceAdjustments: CreateBalanceAdjustment;
  private readonly presenter: AccountPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    balanceAdjustments: CreateBalanceAdjustment,
    presenter: AccountPresenter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.balanceAdjustments = balanceAdjustments;
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateAccountUseCase.Input): Promise<CreateAccountUseCase.Output> {
    const account = Account.createManual(input, this.clock.now());

    return this.unitOfWork.run(async (executor) => {
      await this.accounts.save(account, executor);
      if (input.initialBalanceCents) {
        await this.balanceAdjustments.execute(
          {
            accountId: account.id,
            amountCents: input.initialBalanceCents,
            occurredOn: this.clock.today().value,
            note: 'Saldo inicial',
          },
          executor,
        );
      }

      return this.presenter.presentOne(account, executor);
    });
  }
}

export namespace CreateAccountUseCase {
  export type Input = AccountContract.CreateRequest;
  export type Output = AccountContract.Dto;
}
