import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

// A Pluggy connection whose first round (`first_connection`) started at `startedAt`, with its
// account link pointing at `accountId`. It is what makes a card "of the Pluggy" for `invoices`.
export async function insertTestFirstSync(
  db: Kysely<Database>,
  input: { accountId: string; startedAt: string },
): Promise<{ connectionId: string }> {
  const connectionId = generateId();
  // The connection is born with its first round (`register-connection.usecase.ts`).
  const now = input.startedAt;

  await db
    .insertInto('sync_connections')
    .values({
      id: connectionId,
      pluggy_item_id: generateId(),
      institution_code: 'other',
      institution_name: 'Banco de teste',
      status: 'active',
      error_code: null,
      last_bank_update_at: null,
      last_success_at: null,
      history_status: 'done',
      history_from_on: null,
      created_at: now,
      updated_at: now,
    })
    .execute();
  await db
    .insertInto('sync_runs')
    .values({
      id: generateId(),
      connection_id: connectionId,
      trigger: 'first_connection',
      started_at: input.startedAt,
      finished_at: input.startedAt,
      status: 'success',
      error_code: null,
      created_count: 0,
      updated_count: 0,
      removed_count: 0,
    })
    .execute();
  await db
    .insertInto('sync_account_links')
    .values({
      pluggy_account_id: generateId(),
      pluggy_name: 'cartao',
      pluggy_type: 'credit_card',
      connection_id: connectionId,
      account_id: input.accountId,
      number_hint: null,
      cursor_on: null,
    })
    .execute();

  return { connectionId };
}
