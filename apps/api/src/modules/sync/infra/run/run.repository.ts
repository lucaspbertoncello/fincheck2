import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Run } from '#/modules/sync/domain/run/run.entity.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import { RunItem } from '#/modules/sync/infra/run/run.item.ts';

// The store of the runs on SQLite. Every method accepts the executor of a unit of work; without it,
// it uses the default connection.
export class KyselyRunRepository implements RunRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Run | null> {
    const row = await executor
      .selectFrom('sync_runs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? RunItem.toDomain(row) : null;
  }

  async findRunning(
    connectionId: string,
    since: string,
    executor: Kysely<Database> = this.db,
  ): Promise<Run | null> {
    const row = await executor
      .selectFrom('sync_runs')
      .selectAll()
      .where('connection_id', '=', connectionId)
      .where('status', '=', 'running')
      .where('started_at', '>=', since)
      .orderBy('started_at', 'desc')
      .executeTakeFirst();

    return row ? RunItem.toDomain(row) : null;
  }

  async listRecent(
    connectionId: string,
    limit: number,
    executor: Kysely<Database> = this.db,
  ): Promise<Run[]> {
    const rows = await executor
      .selectFrom('sync_runs')
      .selectAll()
      .where('connection_id', '=', connectionId)
      .orderBy('started_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .execute();

    return rows.map((row) => RunItem.toDomain(row));
  }

  async findLatestOf(
    connectionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, Run>> {
    if (connectionIds.length === 0) return new Map();

    // Newest first: the first row met of each connection is its latest run.
    const rows = await executor
      .selectFrom('sync_runs')
      .selectAll()
      .where('connection_id', 'in', connectionIds)
      .orderBy('started_at', 'desc')
      .orderBy('id', 'desc')
      .execute();
    const latest = new Map<string, Run>();
    for (const row of rows) {
      if (!latest.has(row.connection_id)) latest.set(row.connection_id, RunItem.toDomain(row));
    }

    return latest;
  }

  async save(run: Run, executor: Kysely<Database> = this.db): Promise<void> {
    const row = RunItem.fromEntity(run);

    await executor
      .insertInto('sync_runs')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          finished_at: row.finished_at ?? null,
          status: row.status,
          error_code: row.error_code ?? null,
          created_count: row.created_count,
          updated_count: row.updated_count,
          removed_count: row.removed_count,
        }),
      )
      .execute();
  }

  async trim(
    connectionId: string,
    keep: number,
    executor: Kysely<Database> = this.db,
  ): Promise<void> {
    const kept = await executor
      .selectFrom('sync_runs')
      .select('id')
      .where('connection_id', '=', connectionId)
      .orderBy('started_at', 'desc')
      .orderBy('id', 'desc')
      .limit(keep)
      .execute();
    if (kept.length < keep) return;

    await executor
      .deleteFrom('sync_runs')
      .where('connection_id', '=', connectionId)
      .where(
        'id',
        'not in',
        kept.map((row) => row.id),
      )
      .execute();
  }

  async failInterrupted(
    before: string,
    now: string,
    executor: Kysely<Database> = this.db,
  ): Promise<number> {
    const result = await executor
      .updateTable('sync_runs')
      .set({ status: 'error', error_code: 'PROVIDER_ERROR', finished_at: now })
      .where('status', '=', 'running')
      .where('started_at', '<=', before)
      .executeTakeFirst();

    return Number(result.numUpdatedRows);
  }
}
