import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// A debit (`expense`) that the bank sent, straight in the table. Returns its id.
export function insertTestExpense(
  db: Kysely<Database>,
  accountId: string,
  fields: {
    cents: number;
    on: string;
    description?: string;
    overrides?: Partial<Insertable<TransactionsTable>>;
  },
): Promise<string> {
  const description = fields.description ?? 'Pix enviado';

  return insertTestTransaction(db, accountId, {
    origin: 'bank',
    nature: 'expense',
    nature_set_by: 'system',
    description,
    amount_cents: -fields.cents,
    occurred_on: fields.on,
    bank_description: description,
    bank_amount_cents: -fields.cents,
    bank_occurred_on: fields.on,
    bank_status: 'posted',
    search_text: description.toUpperCase(),
    ...fields.overrides,
  });
}
