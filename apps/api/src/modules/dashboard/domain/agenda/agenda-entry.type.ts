import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

// An item of the agenda with what the calculations need that the contract does not carry.
export type AgendaEntry = {
  item: Agenda.Item;
  // Whether it moves the accounts on its own day. A friend's debt to Lucas does not (it is not
  // income), and neither does a recurring expense on the card (it leaves with the invoice).
  movesCash: boolean;
  // An occurrence of an earlier month, still open, that came along into the current month.
  carriedOver: boolean;
};
