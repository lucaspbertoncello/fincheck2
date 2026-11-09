import type { Insertable, Selectable } from 'kysely';

import type { SyncRunsTable } from '#/database/tables/sync/sync-runs-table.type.ts';
import { Run } from '#/modules/sync/domain/run/run.entity.ts';

// The run as the row of `sync_runs`.
export class RunItem {
  static fromEntity(run: Run): Insertable<SyncRunsTable> {
    return {
      id: run.id,
      connection_id: run.connectionId,
      trigger: run.trigger,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      status: run.status,
      error_code: run.errorCode,
      created_count: run.createdCount,
      updated_count: run.updatedCount,
      removed_count: run.removedCount,
    };
  }

  static toDomain(row: Selectable<SyncRunsTable>): Run {
    return new Run({
      id: row.id,
      connectionId: row.connection_id,
      trigger: row.trigger,
      startedAt: row.started_at,
      status: row.status,
      finishedAt: row.finished_at,
      // The column is free text in the database; the application writes only the closed list.
      errorCode: row.error_code as Run.Attributes['errorCode'],
      createdCount: row.created_count,
      updatedCount: row.updated_count,
      removedCount: row.removed_count,
    });
  }
}
