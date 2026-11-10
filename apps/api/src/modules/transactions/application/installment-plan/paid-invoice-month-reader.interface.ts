import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the invoices of a card that already have a payment registered (total or partial). The
// owner is `invoices`. Editing the value, the count or the invoice of the parcels of a plan asks it
// before touching an invoice that was paid. Answers the months (`YYYY-MM`) of `months` that have one.
export interface PaidInvoiceMonthReader {
  paidMonthsOf(
    accountId: string,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>>;
}
