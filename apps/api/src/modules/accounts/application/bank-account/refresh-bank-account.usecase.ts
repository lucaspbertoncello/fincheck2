import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// A round brought news of an account Fincheck already has: the bank balance (as a fact) and, on a
// card, what it still lacks (last 4 digits, limit). A manual account the connection returns to
// (reconnected, or adopted after a new item) goes back to `pluggy`. An archived account is ignored by
// the sync (BR-ACC-008): nothing is written and the answer says so, so its transactions are not
// imported either. Runs inside the unit of work of the round, with its executor.
export class RefreshBankAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(accounts: AccountRepository<Kysely<Database>>, clock: Clock) {
    this.accounts = accounts;
    this.clock = clock;
  }

  async execute(
    input: RefreshBankAccountUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<RefreshBankAccountUseCase.Output> {
    const account = await this.accounts.findById(input.accountId, executor);
    if (!account) throw new AccountNotFoundError();
    if (account.isArchived()) return { isImported: false, isCard: account.isCard() };

    const now = this.clock.now();
    account.switchToBank(now);
    account.recordBankBalance(
      input.balanceCents === null ? null : Money.fromCents(input.balanceCents),
      now,
    );
    if (input.card) {
      account.fillCardFromBank(
        {
          last4: input.card.last4,
          limit: input.card.limitCents === null ? null : Money.fromCents(input.card.limitCents),
        },
        now,
      );
    }
    await this.accounts.save(account, executor);

    return { isImported: true, isCard: account.isCard() };
  }
}

export namespace RefreshBankAccountUseCase {
  export type Input = {
    accountId: string;
    balanceCents: number | null;
    card: { last4: string | null; limitCents: number | null } | null;
  };

  export type Output = { isImported: boolean; isCard: boolean };
}
