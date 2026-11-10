import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { IconName } from '@fincheck/ui';

import type { FoundFriendPayment } from '#/domain/bills/bill/rules/list-found-friend-payments.rule.ts';
import type { FriendBalance } from '#/domain/bills/bill/rules/compute-friend-balances.rule.ts';
import type { FriendRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { presentFoundPix } from '#/features/bills/friend-list/utils/present-found-pix.util.ts';
import { presentFriendDebt } from '#/features/bills/friend-list/utils/present-friend-debt.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

const NOTES = { 'owes-me': 'te deve', 'i-owe': 'você deve', even: 'quite' } as const;

function describeDebts(openCount: number, settledCount: number): string {
  if (openCount === 0) return countWord(settledCount, 'dívida quitada', 'dívidas quitadas');
  if (settledCount === 0) return countWord(openCount, 'dívida em aberto', 'dívidas em aberto');

  return `${openCount} em aberto · ${countWord(settledCount, 'quitada', 'quitadas')}`;
}

/**
 * One person of the tab: the balance with who owes whom in words, how many debts, and the debts.
 * A Pix found and not linked yet is flagged after the debts ("1 Pix a conferir"), so the balance,
 * which counts what is registered, does not look wrong next to a card that already discounted it.
 */
export function presentFriend(
  friend: FriendBalance,
  today: string,
  categoryIcons: ReadonlyMap<string, IconName>,
  foundPayments: readonly FoundFriendPayment[],
  transactions: Readonly<Record<string, Transaction.Dto>>,
): FriendRowData {
  const debts = describeDebts(friend.openCount, friend.debts.length - friend.openCount);

  return {
    key: friend.key,
    name: friend.name,
    stance: friend.stance,
    balanceCents: Math.abs(friend.balanceCents),
    note: NOTES[friend.stance],
    detail: foundPayments.length > 0 ? `${debts} · ${foundPayments.length} Pix a conferir` : debts,
    debts: friend.debts.map((debt) => presentFriendDebt(debt, today, categoryIcons)),
    foundPixes: foundPayments.map((found) => presentFoundPix(found, friend.debts, transactions)),
  };
}
