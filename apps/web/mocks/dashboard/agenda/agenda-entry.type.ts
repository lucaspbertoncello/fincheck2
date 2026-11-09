import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

// An item of the agenda with what the calculations need that the contract does not carry.
export interface AgendaEntry {
  item: Agenda.Item;
  // Whether it moves the accounts on its own day: a friend's debt to Lucas and a recurring expense
  // on the card do not.
  movesCash: boolean;
  // An occurrence of an earlier month, still open, that came along into the current month.
  carriedOver: boolean;
}
