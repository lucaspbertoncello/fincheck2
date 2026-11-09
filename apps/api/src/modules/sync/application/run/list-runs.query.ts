import type { Run } from '@fincheck/shared/sync/run/run.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireConnection } from '#/modules/sync/application/connection/require-connection.util.ts';
import { toRunDto } from '#/modules/sync/application/run/to-run-dto.util.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';

// How many runs the list shows.
const LIMIT = 20;

// The hours of the attempts, for the error banner (RF-SYN-002, RF-SYN-004): the last 20 runs of the
// connection, the newest first (by the time they started).
export class ListRunsQuery {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
  ) {
    this.connections = connections;
    this.runs = runs;
  }

  async execute(input: ListRunsQuery.Input): Promise<ListRunsQuery.Output> {
    const connection = await requireConnection(this.connections, input.connectionId);

    return { items: (await this.runs.listRecent(connection.id, LIMIT)).map(toRunDto) };
  }
}

export namespace ListRunsQuery {
  export type Input = { connectionId: string };
  export type Output = { items: Run.Dto[] };
}
