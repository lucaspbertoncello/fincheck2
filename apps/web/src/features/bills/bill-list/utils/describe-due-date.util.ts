import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import { daysBetween } from '#/shared/utils/date/days-between.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

function inDays(count: number): string {
  return count === 1 ? 'amanhã' : `em ${count} dias`;
}

function agoDays(count: number): string {
  return count === 1 ? 'há 1 dia' : `há ${count} dias`;
}

/**
 * The text beside the badges of a row: "Vence 25/10, em 3 dias", "Vence 20/10, venceu há 2 dias",
 * "Sem data", "Paga em 28/09" (settled; "Recebido em" when money came in).
 */
export function describeDueDate(
  item: Pick<Agenda.Item, 'dueOn' | 'state' | 'settledOn' | 'flow'>,
  today: string,
): string {
  if (item.state === 'settled') {
    const verb = item.flow === 'in' ? 'Recebido' : 'Paga';
    return item.settledOn ? `${verb} em ${formatDayMonth(item.settledOn)}` : 'Quitada';
  }
  if (!item.dueOn) return 'Sem data';

  const days = daysBetween(today, item.dueOn);
  const date = formatDayMonth(item.dueOn);
  if (days === 0) return `Vence hoje, ${date}`;
  if (days > 0) return `Vence ${date}, ${inDays(days)}`;
  return `Vence ${date}, venceu ${agoDays(-days)}`;
}
