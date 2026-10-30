import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

interface TransactionInput {
  accountId: string;
  method: Transaction.Method;
  description: string;
  amountCents: number;
  occurredOn: string;
  origin?: Transaction.Origin;
  nature?: Transaction.Nature;
  natureSetBy?: 'system' | 'user';
  counterparty?: string | null;
  invoiceMonth?: string | null;
  categoryId?: string | null;
  categorySource?: Transaction.CategorySource | null;
  categoryRuleId?: string | null;
  tagIds?: string[];
  installment?: Transaction.InstallmentDto | null;
}

// A transaction record with the defaults of a posted bank transaction; nature follows the sign.
export function makeTransactionRecord(input: TransactionInput): MockState.TransactionRecord {
  const origin = input.origin ?? 'bank';
  const categoryId = input.categoryId ?? null;

  return {
    id: newId(),
    accountId: input.accountId,
    origin,
    nature: input.nature ?? (input.amountCents < 0 ? 'expense' : 'income'),
    natureSetBy: input.natureSetBy ?? 'system',
    method: input.method,
    description: input.description,
    amountCents: input.amountCents,
    occurredOn: input.occurredOn,
    invoiceMonth: input.invoiceMonth ?? null,
    categoryId,
    categorySource: categoryId ? (input.categorySource ?? 'user') : null,
    categoryRuleId: input.categoryRuleId ?? null,
    tagIds: input.tagIds ?? [],
    splits: [],
    bank:
      origin === 'bank'
        ? {
            description: input.description,
            amountCents: input.amountCents,
            occurredOn: input.occurredOn,
            counterparty: input.counterparty ?? null,
            status: 'posted',
          }
        : null,
    bankChange: null,
    removedByBankAt: null,
    ignoredAt: null,
    editNote: null,
    installment: input.installment ?? null,
    transferCounterpartId: null,
    createdAt: toInstant(input.occurredOn),
    updatedAt: toInstant(input.occurredOn),
  };
}
