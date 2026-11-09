import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `invoices`: to record the total the bank gave for the invoices it closed, and
// to list the invoices still to pay that a debit may be the payment of. The owner is `invoices`,
// which `main` wires here.
export interface SyncInvoices {
  recordBankTotals(
    input: { accountId: string; bills: { dueOn: string; totalCents: number }[] },
    executor: Kysely<Database>,
  ): Promise<{ recordedCount: number }>;
  listPayable(executor?: Kysely<Database>): Promise<SyncInvoices.Payable[]>;
}

export namespace SyncInvoices {
  export type Payable = {
    accountId: string;
    closesOn: string;
    dueOn: string;
    totalCents: number;
  };
}
