import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillsTable } from '#/database/tables/bills/bills-table.type.ts';
import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import { BillItem } from '#/modules/bills/infra/bill/bill.item.ts';

// The store of bills on SQLite. Every method accepts the executor of a unit of work; without it, it
// uses the default connection.
export class KyselyBillRepository implements BillRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Bill | null> {
    const rows = await executor.selectFrom('bills').selectAll().where('id', '=', id).execute();
    const [bill] = await this.hydrate(rows, executor);

    return bill ?? null;
  }

  async findAll(executor: Kysely<Database> = this.db): Promise<Bill[]> {
    const rows = await executor.selectFrom('bills').selectAll().execute();

    return this.hydrate(rows, executor);
  }

  async findLinkedTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (transactionIds.length === 0) return new Set();
    const [payments, origins] = await Promise.all([
      executor
        .selectFrom('bill_payments')
        .select('transaction_id')
        .where('transaction_id', 'in', transactionIds)
        .execute(),
      executor
        .selectFrom('bills')
        .select('origin_transaction_id')
        .where('origin_transaction_id', 'in', transactionIds)
        .execute(),
    ]);

    const linked = new Set<string>();
    for (const row of payments) {
      if (row.transaction_id !== null) linked.add(row.transaction_id);
    }
    for (const row of origins) {
      if (row.origin_transaction_id !== null) linked.add(row.origin_transaction_id);
    }

    return linked;
  }

  async save(bill: Bill, executor: Kysely<Database> = this.db): Promise<void> {
    const { bill: row, payments, dismissals } = BillItem.fromEntity(bill);

    // The direction, the kind, the origin and the creation never change.
    await executor
      .insertInto('bills')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          description: row.description,
          counterparty: row.counterparty ?? null,
          amount_cents: row.amount_cents,
          due_on: row.due_on ?? null,
          category_id: row.category_id ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    await executor.deleteFrom('bill_payments').where('bill_id', '=', bill.id).execute();
    if (payments.length > 0) await executor.insertInto('bill_payments').values(payments).execute();

    await executor.deleteFrom('bill_payment_dismissals').where('bill_id', '=', bill.id).execute();
    if (dismissals.length > 0) {
      await executor.insertInto('bill_payment_dismissals').values(dismissals).execute();
    }
  }

  async delete(id: string, executor: Kysely<Database> = this.db): Promise<void> {
    // The payments and the dismissals go by `ON DELETE CASCADE`.
    await executor.deleteFrom('bills').where('id', '=', id).execute();
  }

  private async hydrate(
    rows: Selectable<BillsTable>[],
    executor: Kysely<Database>,
  ): Promise<Bill[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [payments, dismissals] = await Promise.all([
      executor
        .selectFrom('bill_payments')
        .selectAll()
        .where('bill_id', 'in', ids)
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc')
        .execute(),
      executor
        .selectFrom('bill_payment_dismissals')
        .selectAll()
        .where('bill_id', 'in', ids)
        .orderBy('created_at', 'asc')
        .orderBy('transaction_id', 'asc')
        .execute(),
    ]);

    return rows.map((row) =>
      BillItem.toDomain(
        row,
        payments.filter((payment) => payment.bill_id === row.id),
        dismissals.filter((dismissal) => dismissal.bill_id === row.id),
      ),
    );
  }
}
