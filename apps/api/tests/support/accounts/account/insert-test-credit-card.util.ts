import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountsTable } from '#/database/tables/accounts/accounts-table.type.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';

// A manual credit card (closes on the 5th, due on the 12th) straight in the tables. Returns its id.
export async function insertTestCreditCard(
  db: Kysely<Database>,
  overrides: Partial<Insertable<AccountsTable>> = {},
): Promise<string> {
  const id = await insertTestAccount(db, {
    type: 'credit_card',
    name: 'Cartão de teste',
    ...overrides,
  });
  await db
    .insertInto('credit_cards')
    .values({
      account_id: id,
      brand: 'visa',
      last4: '1234',
      closing_day: 5,
      due_day: 12,
      limit_cents: null,
      theme_id: null,
    })
    .execute();

  return id;
}
