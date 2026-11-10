import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { FoundFriendPayment } from '#/domain/bills/bill/rules/list-found-friend-payments.rule.ts';
import type { FriendFoundPixRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

/**
 * A Pix found, as the line of the person: "Pix achado em 05/11" with the debt it pays under it.
 * The date is the one of the transaction; while it loads, the title has none.
 */
export function presentFoundPix(
  found: FoundFriendPayment,
  debts: readonly Bill.Dto[],
  transactions: Readonly<Record<string, Transaction.Dto>>,
): FriendFoundPixRowData {
  const occurredOn = transactions[found.transactionId]?.occurredOn;
  const debt = debts.find((entry) => entry.id === found.billId);

  return {
    billId: found.billId,
    title: occurredOn ? `Pix achado em ${formatDayMonth(occurredOn)}` : 'Pix achado',
    detail: debt ? `Para "${debt.description}", ainda sem vínculo` : 'Ainda sem vínculo',
    amountCents: found.amountCents,
  };
}
