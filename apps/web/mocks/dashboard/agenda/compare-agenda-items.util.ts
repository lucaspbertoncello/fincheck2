import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

// The order of the lists of the agenda: due day ascending, the ones with no day at the end, then
// by key so the answer is the same every time.
export function compareAgendaItems(a: Agenda.Item, b: Agenda.Item): number {
  return (
    Number(a.dueOn === null) - Number(b.dueOn === null) ||
    (a.dueOn ?? '').localeCompare(b.dueOn ?? '') ||
    a.key.localeCompare(b.key)
  );
}
