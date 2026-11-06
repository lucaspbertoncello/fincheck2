import type { TransactionDay } from '#/shared/types/transactions/transaction-day.type.ts';

/** Cuts the grouped days after `count` transactions, so a long month shows in pages. */
export function takeRows(days: readonly TransactionDay[], count: number): TransactionDay[] {
  const result: TransactionDay[] = [];
  let left = count;

  for (const day of days) {
    if (left <= 0) break;
    result.push(day.items.length <= left ? day : { ...day, items: day.items.slice(0, left) });
    left -= day.items.length;
  }

  return result;
}
