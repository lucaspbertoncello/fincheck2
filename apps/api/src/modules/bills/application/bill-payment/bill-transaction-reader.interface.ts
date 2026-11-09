import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what `bills` needs of the transactions that pay a bill, that a bill originates from, or
// that Lucas may pick. The owner is `transactions`. `requireOne` throws its own
// `TRANSACTION_NOT_FOUND`. `findCandidates` is the raw material of the list Lucas picks the payment
// from: a credit of nature `income`, or a debit of nature `expense`, that counts, between two days.
export interface BillTransactionReader {
  findMany(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, BillTransactionReader.Snapshot>>;
  requireOne(
    transactionId: string,
    executor?: Kysely<Database>,
  ): Promise<BillTransactionReader.Snapshot>;
  findCandidates(
    criteria: { kind: 'income' | 'expense'; from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<BillTransactionReader.Snapshot[]>;
}

export namespace BillTransactionReader {
  export type Snapshot = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    nature: string;
    isSplit: boolean;
    // Not ignored, not removed by the bank without an edit.
    counts: boolean;
    occurredOn: string;
    // In use.
    description: string;
    bankDescription: string | null;
    counterparty: string | null;
    // The part of a friend (`lent`): the whole amount when the nature is `lent`, the sum of the
    // parts of that nature on a split one, zero otherwise. Without sign.
    lentCents: number;
  };
}
