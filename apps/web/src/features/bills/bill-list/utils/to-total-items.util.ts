import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

/** The lines under a total card: one per agenda item, with when it falls due. */
export function toTotalItems(items: readonly Agenda.Item[]) {
  return items.map((item) => ({
    key: item.key,
    label: item.title,
    note: item.dueOn ? `vence ${formatDayMonth(item.dueOn)}` : 'sem data',
    cents: item.remainingCents,
  }));
}
