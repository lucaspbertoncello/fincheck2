import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { AgendaBill } from '#/modules/dashboard/domain/agenda/agenda-bill.type.ts';

// Overdue and partial only while something is left to pay: a bill that the presumed payment covers
// whole is waiting for the link, not late.
export function computeBillAgendaState(
  status: AgendaBill['bill']['status'],
  remainingCents: number,
): Agenda.Item['state'] {
  if (status === 'settled') return 'settled';
  if (remainingCents <= 0) return 'upcoming';
  if (status === 'overdue') return 'overdue';
  if (status === 'partial') return 'partial';

  return 'upcoming';
}
