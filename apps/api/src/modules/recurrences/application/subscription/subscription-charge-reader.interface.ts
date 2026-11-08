import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the debits that may be the charge of a subscription (BR-REC-017). The owner is
// `transactions`. Both answers are expenses that count (not ignored, not removed by the bank
// without an edit), oldest first.
export interface SubscriptionChargeReader {
  // The debits on these accounts between the two days (inclusive), to tell a subscription's
  // charges by its text.
  listAccountCharges(
    criteria: { accountIds: string[]; from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<SubscriptionChargeReader.Charge[]>;
  // The purchases on any card between the two days, installments out: the raw material of the
  // automatic suggestion.
  listCardPurchases(
    criteria: { from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<SubscriptionChargeReader.Charge[]>;
}

export namespace SubscriptionChargeReader {
  export type Charge = {
    transactionId: string;
    accountId: string;
    method: string;
    description: string;
    // Positive.
    amountCents: number;
    occurredOn: string;
  };
}
