import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions that settle (or may settle) an occurrence: what each one is worth
// today, its nature, whether it counts (not ignored, not removed by the bank without an edit), and
// the ones a person may pick from. The owner is `transactions`, which throws its own
// `TRANSACTION_NOT_FOUND` from `requireOne`.
export interface OccurrenceTransactionReader {
  // The ones that exist, by id.
  findMany(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, OccurrenceTransactionReader.Snapshot>>;
  requireOne(
    transactionId: string,
    executor?: Kysely<Database>,
  ): Promise<OccurrenceTransactionReader.Snapshot>;
  // The transactions that may pay an occurrence of the kind: a credit of nature `income` (income) or
  // a debit of nature `expense` (expense), that count, between the two days (inclusive); a credit on
  // the card is never one. Whether one is already linked is for the caller to decide.
  findCandidates(
    criteria: { kind: 'income' | 'expense'; from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<OccurrenceTransactionReader.Snapshot[]>;
}

export namespace OccurrenceTransactionReader {
  export type Snapshot = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    nature:
      | 'expense'
      | 'income'
      | 'transfer'
      | 'invoice_payment'
      | 'balance_adjustment'
      | 'lent'
      | 'reimbursed';
    // On the credit card (method `credit`): a credit there (positive) settles nothing.
    isOnCard: boolean;
    isSplit: boolean;
    // Not ignored and not removed by the bank without an edit: only then does it settle anything.
    counts: boolean;
    occurredOn: string;
    description: string;
    // Who sent or received it, as the bank says. Null on a manual transaction.
    counterparty: string | null;
  };
}
