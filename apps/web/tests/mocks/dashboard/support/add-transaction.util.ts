import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { db } from '#mocks/state/mock-database.store.ts';

// A plain transaction on a bank account (no split, no installment, no tags), made from one of the
// seed so every field the routes read is there. The amount takes the sign of the nature.
export function addTransaction(input: {
  nature: 'expense' | 'income';
  amountCents: number;
  occurredOn: string;
  categoryId?: string | null;
}): MockState.TransactionRecord {
  const template = db.transactions.find(
    (tx) =>
      tx.nature === input.nature &&
      tx.splits.length === 0 &&
      tx.installment === null &&
      db.accounts.find((account) => account.id === tx.accountId)?.type !== 'credit_card',
  );
  if (!template) throw new Error(`seed without a plain ${input.nature}`);

  const record: MockState.TransactionRecord = {
    ...structuredClone(template),
    id: newId(),
    occurredOn: input.occurredOn,
    amountCents: input.nature === 'expense' ? -input.amountCents : input.amountCents,
    categoryId: input.categoryId === undefined ? template.categoryId : input.categoryId,
    ignoredAt: null,
  };
  db.transactions.push(record);

  return record;
}
