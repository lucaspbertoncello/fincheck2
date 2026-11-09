import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import { AccountItem } from '#/modules/accounts/infra/account/account.item.ts';

// The accounts' store on SQLite. Every method accepts the executor of a unit of work; without it,
// it uses the default connection.
export class KyselyAccountRepository implements AccountRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Account | null> {
    const row = await this.selectJoined(executor).where('accounts.id', '=', id).executeTakeFirst();

    return row ? AccountItem.toDomain(row) : null;
  }

  async list(
    options: { includeArchived: boolean },
    executor: Kysely<Database> = this.db,
  ): Promise<Account[]> {
    let query = this.selectJoined(executor);
    if (!options.includeArchived) query = query.where('accounts.archived_at', 'is', null);
    const rows = await query.execute();

    return rows.map((row) => AccountItem.toDomain(row));
  }

  async save(account: Account, executor: Kysely<Database> = this.db): Promise<void> {
    const { account: accountRow, creditCard } = AccountItem.fromEntity(account);

    // `type` and `created_at` never change, so they are not part of the update. `source` changes
    // only through the sync (disconnected, reconnected).
    await executor
      .insertInto('accounts')
      .values(accountRow)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          name: accountRow.name,
          source: accountRow.source,
          institution_code: accountRow.institution_code,
          institution_name: accountRow.institution_name,
          bank_balance_cents: accountRow.bank_balance_cents ?? null,
          bank_balance_at: accountRow.bank_balance_at ?? null,
          archived_at: accountRow.archived_at ?? null,
          updated_at: accountRow.updated_at,
        }),
      )
      .execute();

    if (creditCard) {
      await executor
        .insertInto('credit_cards')
        .values(creditCard)
        .onConflict((conflict) =>
          conflict.column('account_id').doUpdateSet({
            brand: creditCard.brand,
            last4: creditCard.last4 ?? null,
            closing_day: creditCard.closing_day,
            due_day: creditCard.due_day,
            limit_cents: creditCard.limit_cents ?? null,
            theme_id: creditCard.theme_id ?? null,
          }),
        )
        .execute();
    }
  }

  async delete(id: string, executor: Kysely<Database> = this.db): Promise<void> {
    // `credit_cards` goes with the account by `ON DELETE CASCADE`.
    await executor.deleteFrom('accounts').where('id', '=', id).execute();
  }

  private selectJoined(executor: Kysely<Database>) {
    return executor
      .selectFrom('accounts')
      .leftJoin('credit_cards', 'credit_cards.account_id', 'accounts.id')
      .selectAll('accounts')
      .select([
        'credit_cards.brand as card_brand',
        'credit_cards.last4 as card_last4',
        'credit_cards.closing_day as card_closing_day',
        'credit_cards.due_day as card_due_day',
        'credit_cards.limit_cents as card_limit_cents',
        'credit_cards.theme_id as card_theme_id',
      ]);
  }
}
