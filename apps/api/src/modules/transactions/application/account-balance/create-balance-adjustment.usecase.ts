import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// Records a `balance_adjustment` (BR-ACC-006): a manual transaction outside spending and income,
// with the sign of the difference. `accounts` decides whether an account may be adjusted and how
// much; this only writes, inside the unit of work it is handed (the adjustment and the change of
// `accounts` commit or roll back together). Satisfies the `CreateBalanceAdjustment` port of
// `accounts`, which is also how the initial balance of a new account is recorded.
export class CreateBalanceAdjustmentUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(
    input: CreateBalanceAdjustmentUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<CreateBalanceAdjustmentUseCase.Output> {
    const adjustment = Transaction.createBalanceAdjustment(
      {
        accountId: input.accountId,
        amount: Money.fromCents(input.amountCents),
        occurredOn: BusinessDate.of(input.occurredOn),
        note: input.note,
      },
      this.clock.now(),
    );
    await this.transactions.save(adjustment, executor);

    return { transactionId: adjustment.id };
  }
}

export namespace CreateBalanceAdjustmentUseCase {
  export type Input = {
    accountId: string;
    // With sign, never zero.
    amountCents: number;
    occurredOn: string;
    note: string | null;
  };

  export type Output = { transactionId: string };
}
