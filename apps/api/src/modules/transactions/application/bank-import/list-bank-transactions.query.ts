import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The transactions of an account that came from the bank, with the original the bank sent, from a
// day on: the raw material of the sync to tell which transaction of the round is which (BR-TRX-004:
// 2 of 3 fields of the original) and which one the bank stopped sending. Only the ones whose
// original date is inside the window come back; an older one is out of what the round looked at, so
// it is never "removed". The sync asks it through its own port, which this class satisfies.
export class ListBankTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    input: ListBankTransactionsQuery.Input,
    executor: Kysely<Database> = this.db,
  ): Promise<ListBankTransactionsQuery.Row[]> {
    const rows = await executor
      .selectFrom('transactions')
      .select([
        'id',
        'bank_description',
        'bank_amount_cents',
        'bank_occurred_on',
        'bank_removed_at',
      ])
      .where('account_id', '=', input.accountId)
      .where('origin', '=', 'bank')
      .where('bank_occurred_on', '>=', input.fromOn)
      .orderBy('bank_occurred_on', 'asc')
      .orderBy('id', 'asc')
      .execute();

    return rows.flatMap((row) =>
      row.bank_description === null ||
      row.bank_amount_cents === null ||
      row.bank_occurred_on === null
        ? []
        : [
            {
              transactionId: row.id,
              bankDescription: row.bank_description,
              bankAmountCents: row.bank_amount_cents,
              bankOccurredOn: row.bank_occurred_on,
              isRemovedByBank: row.bank_removed_at !== null,
            },
          ],
    );
  }
}

export namespace ListBankTransactionsQuery {
  export type Input = { accountId: string; fromOn: string };

  export type Row = {
    transactionId: string;
    bankDescription: string;
    bankAmountCents: number;
    bankOccurredOn: string;
    isRemovedByBank: boolean;
  };
}
