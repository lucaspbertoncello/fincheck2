import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import { PAYMENT_METHOD_LABELS } from '#/features/review/review-queue/constants/payment-method-labels.constant.ts';

/** "Bradesco, crédito, 19/10": account, method and day of the transaction. */
export function buildTransactionDetail(
  transaction: Pick<Transaction.Dto, 'method' | 'occurredOn'>,
  accountName: string | undefined,
): string {
  const [, month, day] = transaction.occurredOn.split('-');
  const parts = [accountName, PAYMENT_METHOD_LABELS[transaction.method], `${day}/${month}`];

  return parts.filter(Boolean).join(', ');
}
