import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `transactions` that undoes the link: a transaction that Lucas turned into
// a payment goes back to expense or income by its sign; one the detector marked stays a payment
// (and becomes a suggestion again). Runs inside the unit of work.
export interface UnlinkInvoicePaymentTransaction {
  execute(transactionId: string, executor: Kysely<Database>): Promise<void>;
}
