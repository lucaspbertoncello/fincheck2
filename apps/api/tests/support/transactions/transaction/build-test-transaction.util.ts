import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

import { TEST_NOW } from '#tests/support/transactions/transaction/test-now.constant.ts';

// A manual expense of R$ 12,50 on 2026-11-05, in a checking account. `overrides` replaces any
// attribute (`amount`, `occurredOn` and the like are the value objects of the entity).
export function buildTestTransaction(overrides: Partial<Transaction.Attributes> = {}): Transaction {
  return new Transaction({
    accountId: 'account-1',
    origin: 'manual',
    nature: 'expense',
    natureSetBy: 'user',
    method: 'pix',
    description: 'Padaria',
    amount: Money.fromCents(-1250),
    occurredOn: BusinessDate.of('2026-11-05'),
    invoiceMonth: null,
    bank: null,
    bankChange: null,
    removedByBankAt: null,
    ignoredAt: null,
    categoryId: null,
    categorySource: null,
    categoryRuleId: null,
    editNote: null,
    installment: null,
    transferCounterpartId: null,
    splits: [],
    tagIds: [],
    createdAt: TEST_NOW,
    ...overrides,
  });
}
