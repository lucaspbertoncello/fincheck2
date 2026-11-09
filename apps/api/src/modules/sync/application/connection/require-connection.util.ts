import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionNotFoundError } from '#/modules/sync/domain/connection/sync-connection-not-found.error.ts';

// The connection of the id, or `SYNC_CONNECTION_NOT_FOUND`.
export async function requireConnection(
  connections: ConnectionRepository<Kysely<Database>>,
  connectionId: string,
  executor?: Kysely<Database>,
): Promise<Connection> {
  const connection = await connections.findById(connectionId, executor);
  if (!connection) throw new SyncConnectionNotFoundError();

  return connection;
}
