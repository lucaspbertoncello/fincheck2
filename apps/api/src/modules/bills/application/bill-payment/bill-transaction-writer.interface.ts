import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what a bill does to the transactions it ties to. The owner is `transactions`; each call
// runs inside the unit of work of the caller, with its executor. The `release*` ones and
// `clearCategory` undo the effect and do nothing when the transaction no longer has it (or no
// longer exists).
export interface BillTransactionWriter {
  // "Você pagou": the friend part of an expense becomes `lent`, outside spending. The whole
  // transaction when `friendCents` is its whole value; otherwise it splits in two parts.
  lend(transactionId: string, friendCents: number, executor: Kysely<Database>): Promise<void>;
  releaseLent(transactionId: string, executor: Kysely<Database>): Promise<void>;
  // The money that came back from a friend becomes `reimbursed`, outside the income. The whole
  // transaction when `reimbursedCents` is its whole value; otherwise the rest stays `income`.
  reimburse(
    transactionId: string,
    reimbursedCents: number,
    executor: Kysely<Database>,
  ): Promise<void>;
  releaseReimbursed(transactionId: string, executor: Kysely<Database>): Promise<void>;
  // Puts the category of the bill on the transaction when it has none (origin `bill`).
  applyCategory(
    transactionId: string,
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean },
    executor: Kysely<Database>,
  ): Promise<void>;
  // Takes off the category that the bill had put (never one Lucas or a rule chose).
  clearCategory(transactionId: string, executor: Kysely<Database>): Promise<void>;
}
