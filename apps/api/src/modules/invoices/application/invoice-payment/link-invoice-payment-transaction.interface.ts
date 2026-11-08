import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `transactions` that makes a transaction the payment of an invoice: its
// nature becomes `invoice_payment`. Runs inside the unit of work of the payment.
export interface LinkInvoicePaymentTransaction {
  execute(transactionId: string, executor: Kysely<Database>): Promise<void>;
}
