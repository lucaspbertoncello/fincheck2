import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The connection was removed (`sync`, Q8): the account stays and is kept by hand from now on. Answers
// the last balance the bank informed and the type, so the caller can open the manual balance at the
// same value. An account that is already manual answers `null` (nothing to carry over). Runs inside
// the unit of work of the caller, with its executor.
export class ConvertAccountToManualUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(accounts: AccountRepository<Kysely<Database>>, clock: Clock) {
    this.accounts = accounts;
    this.clock = clock;
  }

  async execute(
    input: ConvertAccountToManualUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ConvertAccountToManualUseCase.Output> {
    const account = await this.accounts.findById(input.accountId, executor);
    if (!account) throw new AccountNotFoundError();
    if (!account.isPluggy()) return null;

    const lastBankBalanceCents = account.bankBalance?.cents ?? null;
    account.switchToManual(this.clock.now());
    await this.accounts.save(account, executor);

    return { isCard: account.isCard(), lastBankBalanceCents };
  }
}

export namespace ConvertAccountToManualUseCase {
  export type Input = { accountId: string };
  export type Output = { isCard: boolean; lastBankBalanceCents: number | null } | null;
}
