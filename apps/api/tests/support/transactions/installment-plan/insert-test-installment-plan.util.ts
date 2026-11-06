import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InstallmentPlansTable } from '#/database/tables/transactions/installment-plans-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid plan (R$ 300,00 in 3, first invoice 2026-11) straight in the table; the parcels are the
// transactions the test inserts. Returns its id.
export async function insertTestInstallmentPlan(
  db: Kysely<Database>,
  accountId: string,
  overrides: Partial<Insertable<InstallmentPlansTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  await db
    .insertInto('installment_plans')
    .values({
      id,
      account_id: accountId,
      origin: 'manual',
      description: 'Cadeira ergonômica',
      purchase_on: '2026-10-31',
      total_cents: 30000,
      installment_count: 3,
      first_invoice_month: '2026-11',
      category_id: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    })
    .execute();

  return id;
}
