import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ConnectionDtoBuilder } from '#/modules/sync/application/connection/connection-dto-builder.service.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';

// Every connection with its state (RF-SYN-002): the ones disconnected too, the screen decides if it
// shows them. Ordered by the name of the bank with no difference for case or accent, then by the
// day it was created.
export class ListConnectionsQuery {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly builder: ConnectionDtoBuilder;

  constructor(connections: ConnectionRepository<Kysely<Database>>, builder: ConnectionDtoBuilder) {
    this.connections = connections;
    this.builder = builder;
  }

  async execute(): Promise<ListConnectionsQuery.Output> {
    const all = await this.connections.list();
    const ordered = all.toSorted(
      (a, b) =>
        normalizeText(a.institutionName).localeCompare(normalizeText(b.institutionName)) ||
        a.createdAt.localeCompare(b.createdAt),
    );

    return { items: await this.builder.build(ordered) };
  }
}

export namespace ListConnectionsQuery {
  export type Output = { items: Connection.Dto[] };
}
