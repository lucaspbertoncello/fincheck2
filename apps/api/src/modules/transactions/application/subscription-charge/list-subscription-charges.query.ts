import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';

// The debits that may be the charge of a subscription (BR-REC-017). `recurrences` asks it through
// its `SubscriptionChargeReader`, which this class satisfies. Both answers are expenses that count
// (nature `expense`, not ignored, not removed by the bank without an edit), oldest first, with the
// amount positive.
export class ListSubscriptionChargesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  // The debits on these accounts between the two days (inclusive).
  async listAccountCharges(
    criteria: { accountIds: string[]; from: string; to: string },
    executor: Kysely<Database> = this.db,
  ): Promise<ListSubscriptionChargesQuery.Charge[]> {
    if (criteria.accountIds.length === 0) return [];

    const rows = await this.base(executor, criteria)
      .where('t.account_id', 'in', criteria.accountIds)
      .execute();

    return rows.map((row) => ListSubscriptionChargesQuery.toCharge(row));
  }

  // The purchases on any card between the two days, with the installments out: a purchase of a card
  // is a debit with the method `credit`, and an installment is told by its plan.
  async listCardPurchases(
    criteria: { from: string; to: string },
    executor: Kysely<Database> = this.db,
  ): Promise<ListSubscriptionChargesQuery.Charge[]> {
    const rows = await this.base(executor, criteria)
      .where('t.method', '=', 'credit')
      .where('t.installment_plan_id', 'is', null)
      .execute();

    return rows.map((row) => ListSubscriptionChargesQuery.toCharge(row));
  }

  private base(executor: Kysely<Database>, criteria: { from: string; to: string }) {
    return executor
      .selectFrom('transactions as t')
      .select([
        't.id',
        't.account_id',
        't.method',
        't.description',
        't.amount_cents',
        't.occurred_on',
      ])
      .where('t.nature', '=', 'expense')
      .where('t.amount_cents', '<', 0)
      .where('t.occurred_on', '>=', criteria.from)
      .where('t.occurred_on', '<=', criteria.to)
      .where(entersAccountsSql('t'))
      .orderBy('t.occurred_on', 'asc')
      .orderBy('t.id', 'asc');
  }

  private static toCharge(row: {
    id: string;
    account_id: string;
    method: string;
    description: string;
    amount_cents: number;
    occurred_on: string;
  }): ListSubscriptionChargesQuery.Charge {
    return {
      transactionId: row.id,
      accountId: row.account_id,
      method: row.method,
      description: row.description,
      amountCents: -row.amount_cents,
      occurredOn: row.occurred_on,
    };
  }
}

export namespace ListSubscriptionChargesQuery {
  export type Charge = {
    transactionId: string;
    accountId: string;
    method: string;
    description: string;
    // Positive.
    amountCents: number;
    occurredOn: string;
  };
}
