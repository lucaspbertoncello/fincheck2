import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the open invoice of each card: the month of the invoice that closes next. "What is left
// to pay" and "the next parcel" of an installment plan start from it. The owner is `invoices` (not
// built yet): the routes of the installment plans that need it stay unmounted until it is.
export interface OpenInvoiceMonthReader {
  openMonthsOf(accountIds: string[], executor?: Kysely<Database>): Promise<Map<string, Month>>;
}
