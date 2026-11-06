import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `transactions` that records a `balance_adjustment` (outside the account's
// spending and income, BR-ACC-006). It receives the executor of the unit of work, so the adjustment
// and the change of `accounts` commit or roll back together.
export interface CreateBalanceAdjustment {
  execute(
    input: CreateBalanceAdjustment.Input,
    executor: Kysely<Database>,
  ): Promise<CreateBalanceAdjustment.Output>;
}

export namespace CreateBalanceAdjustment {
  export type Input = {
    accountId: string;
    // With sign, never zero: target balance minus the current one.
    amountCents: number;
    occurredOn: string;
    // The owner builds the description: "Ajuste de saldo" plus the note, when there is one.
    note: string | null;
  };

  export type Output = { transactionId: string };
}
