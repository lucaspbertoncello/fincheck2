import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RecurrenceOccurrencesTable } from '#/database/tables/recurrences/recurrence-occurrences-table.type.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { OccurrenceItem } from '#/modules/recurrences/infra/occurrence/occurrence.item.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The store of occurrences on SQLite. Every method accepts the executor of a unit of work; without
// it, it uses the default connection.
export class KyselyOccurrenceRepository implements OccurrenceRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Occurrence | null> {
    const [occurrence] = await this.findByIds([id], executor);

    return occurrence ?? null;
  }

  async findByIds(ids: string[], executor: Kysely<Database> = this.db): Promise<Occurrence[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const rows = await executor
      .selectFrom('recurrence_occurrences')
      .selectAll()
      .where('id', 'in', unique)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findByMonths(months: Month[], executor: Kysely<Database> = this.db): Promise<Occurrence[]> {
    if (months.length === 0) return [];
    const rows = await executor
      .selectFrom('recurrence_occurrences')
      .selectAll()
      .where(
        'month',
        'in',
        months.map((month) => month.value),
      )
      .execute();

    return this.hydrate(rows, executor);
  }

  async findByRecurrenceIds(
    recurrenceIds: string[],
    months?: Month[],
    executor: Kysely<Database> = this.db,
  ): Promise<Occurrence[]> {
    if (recurrenceIds.length === 0 || months?.length === 0) return [];
    let query = executor
      .selectFrom('recurrence_occurrences')
      .selectAll()
      .where('recurrence_id', 'in', recurrenceIds);
    if (months) {
      query = query.where(
        'month',
        'in',
        months.map((month) => month.value),
      );
    }

    return this.hydrate(await query.execute(), executor);
  }

  async findRecentByRecurrence(
    recurrenceId: string,
    upToMonth: Month,
    limit: number,
    executor: Kysely<Database> = this.db,
  ): Promise<Occurrence[]> {
    const rows = await executor
      .selectFrom('recurrence_occurrences')
      .selectAll()
      .where('recurrence_id', '=', recurrenceId)
      .where('month', '<=', upToMonth.value)
      .orderBy('month', 'desc')
      .limit(limit)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findPendingBefore(
    range: { since: Month; before: Month },
    executor: Kysely<Database> = this.db,
  ): Promise<Occurrence[]> {
    const rows = await executor
      .selectFrom('recurrence_occurrences as o')
      .innerJoin('recurrences as r', 'r.id', 'o.recurrence_id')
      .selectAll('o')
      .where('o.month', '>=', range.since.value)
      .where('o.month', '<', range.before.value)
      .where('r.archived_at', 'is', null)
      .where('r.paused_at', 'is', null)
      .where('o.skipped_at', 'is', null)
      .where('o.settled_at', 'is', null)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findOpenForMatching(
    date: string,
    executor: Kysely<Database> = this.db,
  ): Promise<Occurrence[]> {
    const rows = await executor
      .selectFrom('recurrence_occurrences as o')
      .innerJoin('recurrences as r', 'r.id', 'o.recurrence_id')
      .selectAll('o')
      .where('r.paused_at', 'is', null)
      .where('r.archived_at', 'is', null)
      .where('o.skipped_at', 'is', null)
      .where('o.settled_at', 'is', null)
      .where('o.window_start_on', '<=', date)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findExistingKeys(
    months: Month[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (months.length === 0) return new Set();
    const rows = await executor
      .selectFrom('recurrence_occurrences')
      .select(['recurrence_id', 'month'])
      .where(
        'month',
        'in',
        months.map((month) => month.value),
      )
      .execute();

    return new Set(rows.map((row) => `${row.recurrence_id}|${row.month}`));
  }

  async findLinkedTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (transactionIds.length === 0) return new Set();
    const rows = await executor
      .selectFrom('occurrence_payments')
      .select('transaction_id')
      .where('transaction_id', 'in', transactionIds)
      .execute();

    return new Set(rows.map((row) => row.transaction_id));
  }

  async findLiveLinkedTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (transactionIds.length === 0) return new Set();
    const rows = await executor
      .selectFrom('occurrence_payments as p')
      .innerJoin('recurrence_occurrences as o', 'o.id', 'p.occurrence_id')
      .innerJoin('recurrences as r', 'r.id', 'o.recurrence_id')
      .select('p.transaction_id')
      .where('p.transaction_id', 'in', transactionIds)
      .where('r.archived_at', 'is', null)
      .execute();

    return new Set(rows.map((row) => row.transaction_id));
  }

  async findByLinkedTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Occurrence[]> {
    if (transactionIds.length === 0) return [];
    const rows = await executor
      .selectFrom('recurrence_occurrences')
      .selectAll()
      .where(
        'id',
        'in',
        executor
          .selectFrom('occurrence_payments')
          .select('occurrence_id')
          .where('transaction_id', 'in', transactionIds),
      )
      .execute();

    return this.hydrate(rows, executor);
  }

  async insertMissing(
    occurrences: Occurrence[],
    executor: Kysely<Database> = this.db,
  ): Promise<number> {
    if (occurrences.length === 0) return 0;
    // The unique (recurrence, month) makes a second call, or a concurrent one, add nothing. A fresh
    // occurrence has no payment: they are written by `save`.
    const result = await executor
      .insertInto('recurrence_occurrences')
      .values(occurrences.map((occurrence) => OccurrenceItem.fromEntity(occurrence).occurrence))
      .onConflict((conflict) => conflict.columns(['recurrence_id', 'month']).doNothing())
      .executeTakeFirst();

    return Number(result.numInsertedOrUpdatedRows ?? 0);
  }

  async save(occurrence: Occurrence, executor: Kysely<Database> = this.db): Promise<void> {
    const { occurrence: row, payments } = OccurrenceItem.fromEntity(occurrence);

    // The recurrence, the month and the creation never change.
    await executor
      .insertInto('recurrence_occurrences')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          expected_on: row.expected_on ?? null,
          window_start_on: row.window_start_on,
          window_end_on: row.window_end_on,
          expected_amount_cents: row.expected_amount_cents,
          settled_at: row.settled_at ?? null,
          skipped_at: row.skipped_at ?? null,
          difference_decision: row.difference_decision ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    await executor
      .deleteFrom('occurrence_payments')
      .where('occurrence_id', '=', occurrence.id)
      .execute();
    if (payments.length > 0) {
      await executor.insertInto('occurrence_payments').values(payments).execute();
    }
  }

  async deleteByIds(ids: string[], executor: Kysely<Database> = this.db): Promise<void> {
    if (ids.length === 0) return;
    // The payments go by `ON DELETE CASCADE`.
    await executor.deleteFrom('recurrence_occurrences').where('id', 'in', ids).execute();
  }

  private async hydrate(
    rows: Selectable<RecurrenceOccurrencesTable>[],
    executor: Kysely<Database>,
  ): Promise<Occurrence[]> {
    if (rows.length === 0) return [];
    const payments = await executor
      .selectFrom('occurrence_payments')
      .selectAll()
      .where(
        'occurrence_id',
        'in',
        rows.map((row) => row.id),
      )
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();

    return rows.map((row) =>
      OccurrenceItem.toDomain(
        row,
        payments.filter((payment) => payment.occurrence_id === row.id),
      ),
    );
  }
}
