import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the cycle of a card: the invoice (month of the closing) a purchase falls in, by the
// closing day of the card (BR-INV-001: until the closing it goes in the invoice of the month, after
// it in the next one). The owner is `invoices` (not built yet: the `main` leaves it unwired and a
// card purchase is refused until it is; `transactions` never applies the cycle rule itself).
export interface InvoiceMonthReader {
  monthFor(
    accountId: string,
    purchaseOn: BusinessDate,
    executor?: Kysely<Database>,
  ): Promise<Month>;
}
