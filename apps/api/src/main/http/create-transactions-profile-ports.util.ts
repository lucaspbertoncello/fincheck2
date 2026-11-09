import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { FindLargestPixQuery } from '#/modules/transactions/application/highlight/find-largest-pix.query.ts';
import { ListSpendingLinesQuery } from '#/modules/transactions/application/highlight/list-spending-lines.query.ts';

// What `profile` asks of `transactions`: the spending lines of a period (by competence) and the
// biggest Pix in one direction, for the curiosities. Only reads, so there is no circle to break.
export function createTransactionsProfilePorts(deps: { db: Kysely<Database> }) {
  return {
    spending: new ListSpendingLinesQuery(deps.db),
    pix: new FindLargestPixQuery(deps.db),
  };
}
