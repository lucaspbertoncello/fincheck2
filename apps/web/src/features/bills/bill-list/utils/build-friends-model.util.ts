import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { BillTotalModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { plural } from '#/features/bills/bill-list/utils/plural.util.ts';
import { toTotalItems } from '#/features/bills/bill-list/utils/to-total-items.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';

/**
 * Card "A receber de amigos": does not count as income (BR-BIL-005). Each line is the debt of one
 * person and leads to that person on the Amigos tab (`?person=`); `monthParam` is the month of
 * the address, carried along when it is there.
 */
export function buildFriendsModel(agenda: Agenda.Dto, monthParam?: string): BillTotalModel {
  const friends = agenda.receivable.filter((item) => item.badge === 'friend_receivable');
  const people = new Map(friends.map((item) => [item.key, item.counterparty]));

  return {
    label: 'A receber de amigos',
    totalCents: agenda.friendsReceivable.totalCents,
    caption: `${plural(agenda.friendsReceivable.peopleCount, 'pessoa', 'pessoas')}, não conta como receita`,
    items: toTotalItems(friends).map((line) => {
      const person = people.get(line.key);
      if (!person) return line;

      return {
        ...line,
        href: buildHref(`/recurrences/friends?person=${encodeURIComponent(person)}`, monthParam),
        srHint: `ver as dívidas de ${person}`,
      };
    }),
  };
}
