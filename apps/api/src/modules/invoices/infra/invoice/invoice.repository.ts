import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoicesTable } from '#/database/tables/invoices/invoices-table.type.ts';
import type { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { InvoiceItem } from '#/modules/invoices/infra/invoice/invoice.item.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The store of invoices on SQLite. Every method accepts the executor of a unit of work; without
// it, it uses the default connection.
export class KyselyInvoiceRepository implements InvoiceRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findByAccountAndMonth(
    accountId: string,
    month: Month,
    executor: Kysely<Database> = this.db,
  ): Promise<Invoice | null> {
    const [invoice] = await this.findByAccountAndMonths(accountId, [month], executor);

    return invoice ?? null;
  }

  async findByAccountAndMonths(
    accountId: string,
    months: Month[],
    executor: Kysely<Database> = this.db,
  ): Promise<Invoice[]> {
    if (months.length === 0) return [];
    const rows = await executor
      .selectFrom('invoices')
      .selectAll()
      .where('account_id', '=', accountId)
      .where(
        'month',
        'in',
        months.map((month) => month.value),
      )
      .execute();

    return this.hydrate(rows, executor);
  }

  async findByAccount(accountId: string, executor: Kysely<Database> = this.db): Promise<Invoice[]> {
    const rows = await executor
      .selectFrom('invoices')
      .selectAll()
      .where('account_id', '=', accountId)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findLinkedTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (transactionIds.length === 0) return new Set();
    const rows = await executor
      .selectFrom('invoice_payments')
      .select('transaction_id')
      .where('transaction_id', 'in', transactionIds)
      .execute();

    return new Set(rows.flatMap((row) => row.transaction_id ?? []));
  }

  async save(invoice: Invoice, executor: Kysely<Database> = this.db): Promise<void> {
    const { invoice: row, payments, dismissals } = InvoiceItem.fromEntity(invoice);

    // The cycle dates and `created_at` are written when the row is born and never change.
    await executor
      .insertInto('invoices')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          bank_total_cents: row.bank_total_cents ?? null,
          total_override_cents: row.total_override_cents ?? null,
          override_note: row.override_note ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    await executor.deleteFrom('invoice_payments').where('invoice_id', '=', invoice.id).execute();
    if (payments.length > 0)
      await executor.insertInto('invoice_payments').values(payments).execute();
    await executor
      .deleteFrom('invoice_payment_dismissals')
      .where('invoice_id', '=', invoice.id)
      .execute();
    if (dismissals.length > 0) {
      await executor.insertInto('invoice_payment_dismissals').values(dismissals).execute();
    }
  }

  async deleteByAccount(accountId: string, executor: Kysely<Database> = this.db): Promise<void> {
    // The payments and the dismissals go by `ON DELETE CASCADE`.
    await executor.deleteFrom('invoices').where('account_id', '=', accountId).execute();
  }

  private async hydrate(
    rows: Selectable<InvoicesTable>[],
    executor: Kysely<Database>,
  ): Promise<Invoice[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [payments, dismissals] = await Promise.all([
      executor
        .selectFrom('invoice_payments')
        .selectAll()
        .where('invoice_id', 'in', ids)
        .orderBy('paid_on', 'asc')
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc')
        .execute(),
      executor
        .selectFrom('invoice_payment_dismissals')
        .selectAll()
        .where('invoice_id', 'in', ids)
        .orderBy('created_at', 'asc')
        .orderBy('transaction_id', 'asc')
        .execute(),
    ]);

    return rows.map((row) =>
      InvoiceItem.toDomain(
        row,
        payments.filter((payment) => payment.invoice_id === row.id),
        dismissals.filter((dismissal) => dismissal.invoice_id === row.id),
      ),
    );
  }
}
