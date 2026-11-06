import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestTransaction } from '#tests/support/transactions/transaction/build-test-transaction.util.ts';

// An imported transaction: the bank's version is the one in use, until a test edits it.
export function buildTestBankTransaction(
  overrides: Partial<Transaction.Attributes> = {},
): Transaction {
  return buildTestTransaction({
    origin: 'bank',
    natureSetBy: 'system',
    description: 'PADARIA SANTA CLARA',
    bank: {
      description: 'PADARIA SANTA CLARA',
      amount: Money.fromCents(-1250),
      occurredOn: BusinessDate.of('2026-11-05'),
      counterparty: null,
      status: 'posted',
    },
    ...overrides,
  });
}
