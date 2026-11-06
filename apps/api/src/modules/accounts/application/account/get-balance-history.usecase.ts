import type { BalanceHistory } from '@fincheck/shared/accounts/balance-history/balance-history.type.ts';

import type { AccountMovementReader } from '#/modules/accounts/application/account/account-movement-reader.interface.ts';
import { buildBalancePoints } from '#/modules/accounts/application/account/build-balance-points.util.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// The curve of the month on an account's card: one point a day, from day 1 to today (current month)
// or to the last day (past month), with the balance at the end of the day.
export class GetBalanceHistoryUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly movements: AccountMovementReader;
  private readonly clock: Clock;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    movements: AccountMovementReader,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.movements = movements;
    this.clock = clock;
  }

  async execute(input: GetBalanceHistoryUseCase.Input): Promise<GetBalanceHistoryUseCase.Output> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new AccountNotFoundError();

    const today = this.clock.today();
    const month = Month.of(input.month);
    if (month.value > Month.containing(today).value) {
      throw new RequestValidationError([
        { path: 'month', message: 'O mês não pode ser depois do corrente.' },
      ]);
    }
    account.assertHasBalanceHistory();

    const first = month.firstDay();
    const isCurrentMonth = month.value === Month.containing(today).value;
    const last = isCurrentMonth ? today : month.lastDay();

    const points =
      account.isPluggy() && account.bankBalance
        ? buildBalancePoints({
            first,
            last,
            netByDay: await this.movements.netByDay(account.id, first, today),
            kind: { source: 'pluggy', bankBalanceCents: account.bankBalance.cents },
          })
        : buildBalancePoints({
            first,
            last,
            netByDay: await this.movements.netByDay(account.id, first, last),
            kind: {
              source: 'manual',
              openingCents: await this.movements.netUntil(account.id, first.addDays(-1)),
            },
          });

    return { accountId: account.id, month: month.value, points };
  }
}

export namespace GetBalanceHistoryUseCase {
  export type Input = { accountId: string; month: string };
  export type Output = BalanceHistory.Dto;
}
