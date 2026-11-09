import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';

const CHUNK = 500;

// The transactions the detectors of nature of the import look at (BR-TRX-006, `domain model.md`
// 4.10): the ones from the bank, of any account, that enter the accounts, between two days. Each one
// says what the detector needs to know to leave it alone: the nature and who set it, whether it is
// split, whether Lucas categorized it, and whether it already pays something (an invoice, an
// occurrence, a bill: the links come from their owners through a port). The choice among them is the
// rule of `sync`; `transactions` only reads. A transaction tied to something is never offered.
export class ListDetectionPoolQuery {
  private readonly db: Kysely<Database>;
  private readonly links: TransactionLinksReader | undefined;

  constructor(db: Kysely<Database>, links: TransactionLinksReader | undefined) {
    this.db = db;
    this.links = links;
  }

  async execute(
    input: ListDetectionPoolQuery.Input,
    executor: Kysely<Database> = this.db,
  ): Promise<ListDetectionPoolQuery.Row[]> {
    const rows = await executor
      .selectFrom('transactions as t')
      .leftJoin('credit_cards as c', 'c.account_id', 't.account_id')
      .select([
        't.id',
        't.account_id',
        't.amount_cents',
        't.occurred_on',
        't.bank_description',
        't.description',
        't.nature',
        't.nature_set_by',
        't.category_source',
        't.transfer_counterpart_id',
        'c.account_id as card_account_id',
        sql<number>`exists (select 1 from transaction_splits as s where s.transaction_id = t.id)`.as(
          'is_split',
        ),
      ])
      .where('t.origin', '=', 'bank')
      .where('t.occurred_on', '>=', input.from)
      .where('t.occurred_on', '<=', input.to)
      .where(entersAccountsSql('t'))
      .orderBy('t.occurred_on', 'asc')
      .orderBy('t.id', 'asc')
      .execute();

    const linked = new Set<string>();
    if (this.links) {
      for (let start = 0; start < rows.length; start += CHUNK) {
        const chunk = rows.slice(start, start + CHUNK).map((row) => row.id);
        for (const [id, links] of await this.links.linksOf(chunk, executor)) {
          if (links.occurrence || links.bill || links.invoicePayment) linked.add(id);
        }
      }
    }

    return rows.map((row) => ({
      transactionId: row.id,
      accountId: row.account_id,
      isCard: row.card_account_id !== null,
      amountCents: row.amount_cents,
      occurredOn: row.occurred_on,
      description: row.bank_description ?? row.description,
      nature: row.nature,
      natureSetBy: row.nature_set_by,
      hasUserCategory: row.category_source === 'user',
      isSplit: Boolean(row.is_split),
      isLinked: linked.has(row.id),
      transferCounterpartId: row.transfer_counterpart_id,
    }));
  }
}

export namespace ListDetectionPoolQuery {
  export type Input = { from: string; to: string };

  export type Row = {
    transactionId: string;
    accountId: string;
    isCard: boolean;
    // With sign.
    amountCents: number;
    occurredOn: string;
    description: string;
    nature: Database['transactions']['nature'];
    natureSetBy: 'system' | 'user';
    hasUserCategory: boolean;
    isSplit: boolean;
    isLinked: boolean;
    transferCounterpartId: string | null;
  };
}
