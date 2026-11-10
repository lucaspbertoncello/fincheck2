import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The invoices of a card, among the months asked, that have a payment registered (total or partial,
// tied to a transaction or by hand). `transactions` asks it through its `PaidInvoiceMonthReader`,
// which this class satisfies, before it changes the parcels of an installment plan: an invoice that
// was paid no longer takes a parcel in or out nor a change of value.
export class ListPaidInvoiceMonthsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async paidMonthsOf(
    accountId: string,
    months: Month[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (months.length === 0) return new Set();

    const rows = await executor
      .selectFrom('invoice_payments as p')
      .innerJoin('invoices as i', 'i.id', 'p.invoice_id')
      .select('i.month')
      .distinct()
      .where('i.account_id', '=', accountId)
      .where(
        'i.month',
        'in',
        months.map((month) => month.value),
      )
      .execute();

    return new Set(rows.map((row) => row.month));
  }
}
