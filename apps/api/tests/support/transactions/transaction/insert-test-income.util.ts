import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// A credit (`income`) that the bank sent, from `counterparty`, straight in the table. Returns its id.
export function insertTestIncome(
  db: Kysely<Database>,
  accountId: string,
  fields: {
    cents: number;
    on: string;
    counterparty?: string | null;
    description?: string;
    overrides?: Partial<Insertable<TransactionsTable>>;
  },
): Promise<string> {
  const description = fields.description ?? 'Pix recebido';

  return insertTestTransaction(db, accountId, {
    origin: 'bank',
    nature: 'income',
    nature_set_by: 'system',
    description,
    amount_cents: fields.cents,
    occurred_on: fields.on,
    bank_description: description,
    bank_amount_cents: fields.cents,
    bank_occurred_on: fields.on,
    bank_counterparty: fields.counterparty ?? null,
    bank_status: 'posted',
    search_text: description.toUpperCase(),
    ...fields.overrides,
  });
}
