import type { IconName } from '@fincheck/ui';

import type { FriendBalance } from '#/domain/bills/bill/rules/compute-friend-balances.rule.ts';
import type { FriendRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { presentFriendDebt } from '#/features/bills/friend-list/utils/present-friend-debt.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

const NOTES = { 'owes-me': 'te deve', 'i-owe': 'você deve', even: 'quite' } as const;

function describeDebts(openCount: number, settledCount: number): string {
  if (openCount === 0) return countWord(settledCount, 'dívida quitada', 'dívidas quitadas');
  if (settledCount === 0) return countWord(openCount, 'dívida em aberto', 'dívidas em aberto');

  return `${openCount} em aberto · ${countWord(settledCount, 'quitada', 'quitadas')}`;
}

/** One person of the tab: the balance with who owes whom in words, how many debts, and the debts. */
export function presentFriend(
  friend: FriendBalance,
  today: string,
  categoryIcons: ReadonlyMap<string, IconName>,
): FriendRowData {
  return {
    key: friend.key,
    name: friend.name,
    stance: friend.stance,
    balanceCents: Math.abs(friend.balanceCents),
    note: NOTES[friend.stance],
    detail: describeDebts(friend.openCount, friend.debts.length - friend.openCount),
    debts: friend.debts.map((debt) => presentFriendDebt(debt, today, categoryIcons)),
  };
}
