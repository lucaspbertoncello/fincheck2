import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A valid manual expense straight in the table (no entity yet). Returns its id.
export async function insertTestTransaction(
  db: Kysely<Database>,
  accountId: string,
  overrides: Partial<Insertable<TransactionsTable>> = {},
): Promise<string> {
  const id = overrides.id ?? generateId();
  await db
    .insertInto('transactions')
    .values({
      id,
      account_id: accountId,
      origin: 'manual',
      nature: 'expense',
      nature_set_by: 'user',
      method: 'pix',
      description: 'Padaria',
      amount_cents: -1250,
      occurred_on: '2026-11-05',
      invoice_month: null,
      bank_description: null,
      bank_amount_cents: null,
      bank_occurred_on: null,
      bank_counterparty: null,
      bank_status: null,
      bank_change_json: null,
      bank_changed_at: null,
      bank_removed_at: null,
      ignored_at: null,
      category_id: null,
      category_source: null,
      category_rule_id: null,
      search_text: 'PADARIA',
      edit_note: null,
      installment_plan_id: null,
      installment_number: null,
      transfer_counterpart_id: null,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    })
    .execute();

  return id;
}
