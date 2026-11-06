import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what the deletion of a card takes from `invoices` (the count shown before).
export interface AccountInvoicesReader {
  countOf(accountId: string, executor?: Kysely<Database>): Promise<number>;
}
