import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

/** A transaction of the contract with sensible defaults; each test overrides what it is about. */
export function makeTransaction(overrides: Partial<Transaction.Dto> = {}): Transaction.Dto {
  return {
    id: 'trx-1',
    accountId: 'acc-1',
    origin: 'bank',
    nature: 'expense',
    natureSetBy: 'system',
    method: 'debit',
    description: 'PADARIA',
    amountCents: -5000,
    occurredOn: '2026-10-20',
    competenceOn: '2026-10-20',
    invoiceMonth: null,
    categoryId: 'cat-1',
    categorySource: 'user',
    categoryRuleId: null,
    tagIds: [],
    splits: [],
    isEdited: false,
    bank: null,
    bankChange: null,
    removedByBankAt: null,
    ignoredAt: null,
    editNote: null,
    installment: null,
    transferCounterpartId: null,
    links: { occurrence: null, bill: null, invoicePayment: null },
    isInReview: false,
    categorySuggestion: null,
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
    ...overrides,
  };
}
