import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// An account or card the bank sent that Fincheck does not have yet (the sync, first round of an
// item, or an account the bank sent anew). Born `pluggy`, with the bank balance recorded as a fact.
// It runs inside the unit of work of the round, with its executor.
export class ImportBankAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(accounts: AccountRepository<Kysely<Database>>, clock: Clock) {
    this.accounts = accounts;
    this.clock = clock;
  }

  async execute(
    input: ImportBankAccountUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ImportBankAccountUseCase.Output> {
    const account = Account.createFromBank(
      {
        type: input.type,
        name: input.name,
        institutionCode: input.institutionCode,
        institutionName: input.institutionName,
        balance: input.balanceCents === null ? null : Money.fromCents(input.balanceCents),
        card: input.card
          ? {
              brand: input.card.brand,
              last4: input.card.last4,
              closingDay: input.card.closingDay,
              dueDay: input.card.dueDay,
              limit: input.card.limitCents === null ? null : Money.fromCents(input.card.limitCents),
            }
          : null,
      },
      this.clock.now(),
    );
    await this.accounts.save(account, executor);

    return { accountId: account.id };
  }
}

export namespace ImportBankAccountUseCase {
  export type Input = {
    type: 'checking' | 'savings' | 'credit_card';
    name: string;
    institutionCode: Institution.Code;
    institutionName: string | null;
    // As the bank sent it; on a card the amount used (positive).
    balanceCents: number | null;
    card: {
      brand: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
      last4: string | null;
      closingDay: number;
      dueDay: number;
      limitCents: number | null;
    } | null;
  };

  export type Output = { accountId: string };
}
