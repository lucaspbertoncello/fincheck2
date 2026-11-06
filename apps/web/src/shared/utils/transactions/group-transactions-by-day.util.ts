import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { TransactionDay } from '#/shared/types/transactions/transaction-day.type.ts';
import { isCountingNature } from '#/domain/transactions/transaction/rules/is-counting-nature.rule.ts';
import { formatDayHeading } from '#/shared/utils/date/format-day-heading.util.ts';

/** Groups the transactions (already newest first) by their competence day, keeping the order. */
export function groupTransactionsByDay(
  transactions: readonly Transaction.Dto[],
  today: string,
): TransactionDay[] {
  const days = new Map<string, TransactionDay>();

  for (const transaction of transactions) {
    const date = transaction.competenceOn;
    let day = days.get(date);
    if (!day) {
      day = { date, ...formatDayHeading(date, today), totalCents: 0, count: 0, items: [] };
      days.set(date, day);
    }
    day.items.push(transaction);
    day.count += 1;
    if (isCountingNature(transaction.nature) && transaction.ignoredAt === null) {
      day.totalCents += transaction.amountCents;
    }
  }

  return [...days.values()];
}
