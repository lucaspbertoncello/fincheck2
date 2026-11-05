import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { BillTotalModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { plural } from '#/features/bills/bill-list/utils/plural.util.ts';
import { toTotalItems } from '#/features/bills/bill-list/utils/to-total-items.util.ts';

/** Card "A receber de amigos": does not count as income (BR-BIL-005). */
export function buildFriendsModel(agenda: Agenda.Dto): BillTotalModel {
  const friends = agenda.receivable.filter((item) => item.badge === 'friend_receivable');

  return {
    label: 'A receber de amigos',
    totalCents: agenda.friendsReceivable.totalCents,
    caption: `${plural(agenda.friendsReceivable.peopleCount, 'pessoa', 'pessoas')}, não conta como receita`,
    items: toTotalItems(friends),
  };
}
