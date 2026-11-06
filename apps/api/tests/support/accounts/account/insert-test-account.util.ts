import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountsTable } from '#/database/tables/accounts/accounts-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid manual checking account straight in the table (no entity yet). Returns its id.
export async function insertTestAccount(
  db: Kysely<Database>,
  overrides: Partial<Insertable<AccountsTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  await db
    .insertInto('accounts')
    .values({
      id,
      type: 'checking',
      source: 'manual',
      name: 'Conta de teste',
      institution_code: 'other',
      institution_name: null,
      bank_balance_cents: null,
      bank_balance_at: null,
      archived_at: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    })
    .execute();

  return id;
}
