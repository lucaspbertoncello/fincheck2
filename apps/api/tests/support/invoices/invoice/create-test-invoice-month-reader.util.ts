import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthReader } from '#/modules/transactions/application/transaction/invoice-month-reader.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// Stands for the `invoices` context in the tests of `transactions`. The cycle here is the simplest
// one that exercises the port (up to the closing day goes in the invoice of the month, after it in
// the next one); the real rule belongs to `invoices`.
export function createTestInvoiceMonthReader(db: Kysely<Database>): InvoiceMonthReader {
  return {
    async monthFor(accountId, purchaseOn, executor = db) {
      const card = await executor
        .selectFrom('credit_cards')
        .select('closing_day')
        .where('account_id', '=', accountId)
        .executeTakeFirstOrThrow();
      const month = Month.containing(purchaseOn);

      return purchaseOn.day <= card.closing_day ? month : month.next();
    },
  };
}
