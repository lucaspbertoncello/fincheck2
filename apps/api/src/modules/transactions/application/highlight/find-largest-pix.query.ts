import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';

// The biggest Pix in one direction, the whole history (BR-PRF-005): `profile` asks it through its
// `ProfilePixReader`, which this class satisfies. The meio `pix` that enters the accounts, out of
// the transfers between own accounts and the payments of an invoice. Ties go to the most recent.
export class FindLargestPixQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findLargestPix(direction: 'sent' | 'received'): Promise<FindLargestPixQuery.Pix | null> {
    const sent = direction === 'sent';

    const row = await this.db
      .selectFrom('transactions as t')
      .select(['t.id', 't.amount_cents', 't.occurred_on', 't.bank_counterparty'])
      .where('t.method', '=', 'pix')
      .where('t.nature', 'not in', ['transfer', 'invoice_payment'])
      .where('t.amount_cents', sent ? '<' : '>', 0)
      .where(entersAccountsSql('t'))
      .orderBy('t.amount_cents', sent ? 'asc' : 'desc')
      .orderBy('t.occurred_on', 'desc')
      .orderBy('t.id', 'desc')
      .limit(1)
      .executeTakeFirst();
    if (!row) return null;

    const counterparty = row.bank_counterparty?.trim() ?? '';

    return {
      transactionId: row.id,
      amountCents: Math.abs(row.amount_cents),
      counterparty: counterparty === '' ? null : counterparty,
      occurredOn: row.occurred_on,
    };
  }
}

export namespace FindLargestPixQuery {
  export type Pix = {
    transactionId: string;
    // Positive.
    amountCents: number;
    counterparty: string | null;
    occurredOn: string;
  };
}
