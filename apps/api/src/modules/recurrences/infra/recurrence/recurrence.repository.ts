import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { RecurrenceItem } from '#/modules/recurrences/infra/recurrence/recurrence.item.ts';

// The store of recurrences on SQLite. Every method accepts the executor of a unit of work; without
// it, it uses the default connection.
export class KyselyRecurrenceRepository implements RecurrenceRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Recurrence | null> {
    const row = await executor
      .selectFrom('recurrences')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? RecurrenceItem.toDomain(row) : null;
  }

  async findByIds(ids: string[], executor: Kysely<Database> = this.db): Promise<Recurrence[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const rows = await executor
      .selectFrom('recurrences')
      .selectAll()
      .where('id', 'in', unique)
      .execute();

    return rows.map((row) => RecurrenceItem.toDomain(row));
  }

  async findMany(
    filter: { includeArchived: boolean; subscriptionsOnly?: boolean },
    executor: Kysely<Database> = this.db,
  ): Promise<Recurrence[]> {
    let query = executor.selectFrom('recurrences').selectAll();
    if (!filter.includeArchived) query = query.where('archived_at', 'is', null);
    if (filter.subscriptionsOnly) query = query.where('is_subscription', '=', 1);
    const rows = await query.orderBy('created_at', 'asc').orderBy('id', 'asc').execute();

    return rows.map((row) => RecurrenceItem.toDomain(row));
  }

  async findActive(executor: Kysely<Database> = this.db): Promise<Recurrence[]> {
    const rows = await executor
      .selectFrom('recurrences')
      .selectAll()
      .where('paused_at', 'is', null)
      .where('archived_at', 'is', null)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();

    return rows.map((row) => RecurrenceItem.toDomain(row));
  }

  async save(recurrence: Recurrence, executor: Kysely<Database> = this.db): Promise<void> {
    const row = RecurrenceItem.fromEntity(recurrence);
    // The id, the kind and the creation never change.
    const changeable: Partial<typeof row> = { ...row };
    delete changeable.id;
    delete changeable.kind;
    delete changeable.created_at;

    await executor
      .insertInto('recurrences')
      .values(row)
      .onConflict((conflict) => conflict.column('id').doUpdateSet(changeable))
      .execute();
  }
}
