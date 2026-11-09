import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import { compareAgendaItems } from '#/modules/dashboard/domain/agenda/compare-agenda-items.util.ts';
import { computeDaysRemaining } from '#/modules/dashboard/domain/free-balance/compute-days-remaining.util.ts';
import { computePerDay } from '#/modules/dashboard/domain/free-balance/compute-per-day.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The Livre (BR-DSH-003), from today to the end of the month:
//
//   Livre = balance in the accounts + what still comes in - what still goes out
//
// What still comes in and goes out is what is LEFT (`remainingCents`, already without what was paid
// and without the presumed payment) of each item of the agenda that counts in the Livre
// (`countsInFreeBalance`). Pure, in whole cents: the same numbers feed the summary, the agenda and
// the last day of the timeline, so they cannot disagree.
export function computeFreeBalance(input: {
  accountsTotal: Money;
  entries: AgendaEntry[];
  today: BusinessDate;
}): ComputeFreeBalance.Result {
  const counting = input.entries
    .map((entry) => entry.item)
    .filter((item) => item.countsInFreeBalance && item.remainingCents > 0)
    .toSorted(compareAgendaItems);
  const receivable = counting.filter((item) => item.flow === 'in');
  const payable = counting.filter((item) => item.flow === 'out');
  const sum = (items: Agenda.Item[]) =>
    items.reduce((total, item) => total.add(Money.fromCents(item.remainingCents)), Money.zero());

  const receivableTotal = sum(receivable);
  const payableTotal = sum(payable);
  const free = input.accountsTotal.add(receivableTotal).subtract(payableTotal);
  const daysRemaining = computeDaysRemaining(input.today);

  return {
    daysRemaining,
    free,
    perDay: computePerDay(free, daysRemaining),
    receivable,
    payable,
    receivableTotal,
    payableTotal,
    movements: counting.map((item) => ({
      dueOn: item.dueOn,
      cents: item.flow === 'in' ? item.remainingCents : -item.remainingCents,
    })),
  };
}

export namespace ComputeFreeBalance {
  export type Result = {
    daysRemaining: number;
    free: Money;
    perDay: Money;
    receivable: Agenda.Item[];
    payable: Agenda.Item[];
    receivableTotal: Money;
    payableTotal: Money;
    // What the Livre counts, signed (in positive, out negative), with the day each one is due.
    movements: { dueOn: string | null; cents: number }[];
  };
}
