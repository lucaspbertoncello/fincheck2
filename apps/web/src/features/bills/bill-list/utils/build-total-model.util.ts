import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { BillTotalModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

function toItems(items: readonly Agenda.Item[]) {
  return items.map((item) => ({
    key: item.key,
    label: item.title,
    note: item.dueOn ? `vence ${formatDayMonth(item.dueOn)}` : 'sem data',
    cents: item.remainingCents,
  }));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Card "A pagar": the total is the Livre's (BR-DSH-003); the items are its composition. */
export function buildPayableModel(agenda: Agenda.Dto, endOfMonth: string): BillTotalModel {
  return {
    label: 'A pagar',
    totalCents: agenda.payable.totalCents,
    caption: `${plural(agenda.payable.count, 'conta', 'contas')}, até ${formatDayMonth(endOfMonth)} e faturas abertas`,
    items: toItems(agenda.payable.items),
  };
}

/** Card "A receber de amigos": does not count as income (BR-BIL-005). */
export function buildFriendsModel(agenda: Agenda.Dto): BillTotalModel {
  const friends = agenda.receivable.filter((item) => item.badge === 'friend_receivable');

  return {
    label: 'A receber de amigos',
    totalCents: agenda.friendsReceivable.totalCents,
    caption: `${plural(agenda.friendsReceivable.peopleCount, 'pessoa', 'pessoas')}, não conta como receita`,
    items: toItems(friends),
  };
}
