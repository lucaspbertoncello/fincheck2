import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The transactions of the cycle of a card, for the invoice: the ones with that `invoice_month`
// that enter the accounts (not ignored, not removed by the bank without an edit) and are not the
// payment of an invoice (BR-INV-002: the payment is outside the accounts and outside the invoice).
// A transfer, a debt or an adjustment on the card still counts: the bank charges it all the same.
// `invoices` asks it through its `CardInvoiceTransactionReader`, which this class satisfies.
export class GetCardInvoiceTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async totalsByMonth(
    accountId: string,
    months: Month[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, GetCardInvoiceTransactionsQuery.Totals>> {
    if (months.length === 0) return new Map();

    const rows = await executor
      .selectFrom('transactions as t')
      .select([
        't.invoice_month',
        sql<number>`coalesce(sum(case when t.installment_plan_id is null then -t.amount_cents else 0 end), 0)`.as(
          'purchases_cents',
        ),
        sql<number>`coalesce(sum(case when t.installment_plan_id is not null then -t.amount_cents else 0 end), 0)`.as(
          'installments_cents',
        ),
        sql<number>`count(*)`.as('transaction_count'),
      ])
      .where('t.account_id', '=', accountId)
      .where(
        't.invoice_month',
        'in',
        months.map((month) => month.value),
      )
      .where('t.nature', '!=', 'invoice_payment')
      .where(entersAccountsSql('t'))
      .groupBy('t.invoice_month')
      .execute();

    return new Map(
      rows.flatMap((row) =>
        row.invoice_month === null
          ? []
          : [
              [
                row.invoice_month,
                {
                  purchasesCents: Number(row.purchases_cents),
                  installmentsCents: Number(row.installments_cents),
                  transactionCount: Number(row.transaction_count),
                },
              ] as const,
            ],
      ),
    );
  }

  async itemsOf(
    accountId: string,
    month: Month,
    executor: Kysely<Database> = this.db,
  ): Promise<GetCardInvoiceTransactionsQuery.Item[]> {
    const rows = await executor
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .select([
        't.id',
        't.description',
        't.occurred_on',
        't.amount_cents',
        't.nature',
        't.category_id',
        't.installment_number',
        'p.installment_count',
      ])
      .where('t.account_id', '=', accountId)
      .where('t.invoice_month', '=', month.value)
      .where('t.nature', '!=', 'invoice_payment')
      .where(entersAccountsSql('t'))
      .execute();
    if (rows.length === 0) return [];

    const parts = await executor
      .selectFrom('transaction_splits')
      .select(['transaction_id', 'category_id', 'amount_cents', 'nature'])
      .where(
        'transaction_id',
        'in',
        rows.map((row) => row.id),
      )
      .orderBy('position', 'asc')
      .execute();

    return rows.map((row) => ({
      transactionId: row.id,
      description: row.description,
      occurredOn: row.occurred_on,
      amountCents: row.amount_cents,
      nature: row.nature,
      categoryId: row.category_id,
      installment:
        row.installment_number !== null && row.installment_count !== null
          ? { number: row.installment_number, count: row.installment_count }
          : null,
      parts: parts
        .filter((part) => part.transaction_id === row.id)
        .map((part) => ({
          categoryId: part.category_id,
          amountCents: part.amount_cents,
          nature: part.nature,
        })),
    }));
  }

  async invoiceMonthsOf(accountId: string, executor: Kysely<Database> = this.db): Promise<Month[]> {
    const rows = await executor
      .selectFrom('transactions')
      .select('invoice_month')
      .distinct()
      .where('account_id', '=', accountId)
      .where('invoice_month', 'is not', null)
      .orderBy('invoice_month', 'asc')
      .execute();

    return rows.flatMap((row) => (row.invoice_month === null ? [] : [Month.of(row.invoice_month)]));
  }
}

export namespace GetCardInvoiceTransactionsQuery {
  export type Totals = {
    purchasesCents: number;
    installmentsCents: number;
    transactionCount: number;
  };

  export type Item = {
    transactionId: string;
    description: string;
    occurredOn: string;
    amountCents: number;
    nature: Database['transactions']['nature'];
    categoryId: string | null;
    installment: { number: number; count: number } | null;
    parts: {
      categoryId: string | null;
      amountCents: number;
      nature: Database['transaction_splits']['nature'];
    }[];
  };
}
