import type { BalanceAdjustment } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import type { CreateBalanceAdjustment } from '#/modules/accounts/application/account/create-balance-adjustment.interface.ts';
import type { ManualBalanceReader } from '#/modules/accounts/application/account/manual-balance-reader.interface.ts';
import { AccountBalanceUnchangedError } from '#/modules/accounts/domain/account/account-balance-unchanged.error.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Ajustar saldo" (manual account) and "Atualizar saldo" (wallet): records a `balance_adjustment`
// with the difference between the target and the balance of today, so the balance shows the target
// (BR-ACC-006). `transactions` records it; `accounts` decides whether it may and how much.
export class AdjustAccountBalanceUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly manualBalances: ManualBalanceReader;
  private readonly balanceAdjustments: CreateBalanceAdjustment;
  private readonly presenter: AccountPresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    manualBalances: ManualBalanceReader,
    balanceAdjustments: CreateBalanceAdjustment,
    presenter: AccountPresenter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.manualBalances = manualBalances;
    this.balanceAdjustments = balanceAdjustments;
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: AdjustAccountBalanceUseCase.Input,
  ): Promise<AdjustAccountBalanceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.findById(input.accountId, executor);
      if (!account) throw new AccountNotFoundError();
      account.assertBalanceAdjustable();

      const today = this.clock.today();
      const occurredOn = input.occurredOn ?? today.value;
      if (occurredOn > today.value) {
        throw new RequestValidationError([
          { path: 'occurredOn', message: 'A data do ajuste não pode ser futura.' },
        ]);
      }

      const balances = await this.manualBalances.balancesOf([account.id], executor);
      const difference = Money.fromCents(input.targetBalanceCents).subtract(
        Money.fromCents(balances.get(account.id) ?? 0),
      );
      if (difference.isZero()) throw new AccountBalanceUnchangedError();

      const { transactionId } = await this.balanceAdjustments.execute(
        {
          accountId: account.id,
          amountCents: difference.cents,
          occurredOn,
          note: input.note ?? null,
        },
        executor,
      );

      return {
        account: await this.presenter.presentOne(account, executor),
        adjustment: { transactionId, amountCents: difference.cents },
      };
    });
  }
}

export namespace AdjustAccountBalanceUseCase {
  export type Input = { accountId: string } & BalanceAdjustment.Request;
  export type Output = BalanceAdjustment.Response;
}
