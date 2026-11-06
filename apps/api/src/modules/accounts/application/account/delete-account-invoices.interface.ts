import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `invoices` that deletes the invoices of a card. Runs inside the unit of
// work of the deletion.
export interface DeleteAccountInvoices {
  execute(accountId: string, executor: Kysely<Database>): Promise<void>;
}
