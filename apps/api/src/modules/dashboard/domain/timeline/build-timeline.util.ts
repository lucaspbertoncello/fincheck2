import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';

import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import { buildTimelineItem } from '#/modules/dashboard/domain/timeline/build-timeline-item.util.ts';
import { computeLandingDate } from '#/modules/dashboard/domain/timeline/compute-landing-date.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The days, the "atrasados" and the "sem data" chips of the timeline of a month (BR-DSH-008), with
// no balance yet (`projectBalances` gives it, in the current month only).
//
// - `all` (Visão geral, "Até o fim do mês"): what moves the accounts. Done in the month, on the day
//   it was done (`happened`); still to come, on its day, with the late ones (and, in the current
//   month, the ones whose day passed) in the "atrasados" chips and the ones with no day in "sem
//   data". An item that counts in the Livre and falls due after the month (an invoice) goes on the
//   last day, where the projection puts it. A friend's debt to Lucas and a recurring expense on the
//   card are not here: neither moves the account on that day.
// - `recurrences` (the strip of Recorrentes): only the occurrences, the whole month, each on its
//   expected day with its state (late too, which is the amber marker). Only the ones that came
//   along from an earlier month go to the "atrasados" chips.
export function buildTimeline(input: {
  month: Month;
  today: BusinessDate;
  scope: 'all' | 'recurrences';
  entries: AgendaEntry[];
}): { days: Timeline.Day[]; overdue: Timeline.Item[]; undated: Timeline.Item[] } {
  const { month, today, scope } = input;
  const isCurrent = Month.containing(today).equals(month);
  const first = month.firstDay();
  const last = month.lastDay();
  const inMonth = (date: string | null) =>
    date !== null && date >= first.value && date <= last.value;

  const days: Timeline.Day[] = [];
  for (let day = first; !last.isBefore(day); day = day.addDays(1)) {
    days.push({
      date: day.value,
      isPast: day.isBefore(today),
      isToday: day.equals(today),
      projectedBalanceCents: null,
      items: [],
    });
  }
  const overdue: Timeline.Item[] = [];
  const undated: Timeline.Item[] = [];
  const place = (date: string, item: Timeline.Item) =>
    days[Number(date.slice(8, 10)) - 1]?.items.push(item);

  for (const { item, movesCash, carriedOver } of input.entries) {
    if (scope === 'recurrences' ? item.source.type !== 'occurrence' : !movesCash) continue;

    if (item.state === 'settled') {
      const date = scope === 'recurrences' && inMonth(item.dueOn) ? item.dueOn : item.settledOn;
      if (date !== null && inMonth(date)) place(date, buildTimelineItem(item, date));
      continue;
    }

    if (scope === 'all' && item.remainingCents <= 0) continue;
    if (item.dueOn === null) {
      undated.push(buildTimelineItem(item, null));
      continue;
    }

    if (scope === 'recurrences') {
      if (carriedOver) overdue.push(buildTimelineItem(item, item.dueOn));
      else if (inMonth(item.dueOn)) place(item.dueOn, buildTimelineItem(item, item.dueOn));
      continue;
    }

    const isLate = item.state === 'overdue' || (isCurrent && item.dueOn < today.value);
    if (isLate) {
      if (isCurrent || inMonth(item.dueOn)) overdue.push(buildTimelineItem(item, item.dueOn));
    } else if (inMonth(item.dueOn)) {
      place(item.dueOn, buildTimelineItem(item, item.dueOn));
    } else if (isCurrent && item.countsInFreeBalance) {
      const landsOn = computeLandingDate(item.dueOn, today, last);
      place(landsOn, buildTimelineItem(item, landsOn));
    }
  }

  const order = (a: Timeline.Item, b: Timeline.Item) =>
    a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }) || a.key.localeCompare(b.key);
  for (const day of days) day.items.sort(order);
  overdue.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || order(a, b));
  undated.sort(order);

  return { days, overdue, undated };
}
