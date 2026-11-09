import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { GetAccountConnectionsQuery } from '#/modules/sync/application/connection/get-account-connections.query.ts';

// What is before the `sync` module: it only reads its own tables, so `accounts` can ask it for the
// connection of an account before the other modules exist (the other modules need `accounts`, and
// `sync` needs them all: this breaks the circle).
export function createSyncReaders(deps: { db: Kysely<Database> }) {
  return { accountConnections: new GetAccountConnectionsQuery(deps.db) };
}
