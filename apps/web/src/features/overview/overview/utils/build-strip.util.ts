import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';

import type { StripData, StripDay } from '#/features/overview/overview/overview.model.ts';

/** What comes in or goes out on a day, in cents. */
function sumByFlow(items: readonly Timeline.Item[], flow: Timeline.Item['flow']): number {
  return items
    .filter((item) => item.flow === flow)
    .reduce((sum, item) => sum + item.amountCents, 0);
}

/**
 * Days of "Até o fim do mês": from today to the last day. A month that already ended has no
 * "from today", so it shows every day (without projected balance, which the API leaves null).
 */
export function buildStrip(timeline: Timeline.Dto): StripData {
  const upcoming = timeline.days.filter((day) => !day.isPast);
  const shown = upcoming.length > 0 ? upcoming : timeline.days;

  return {
    today: timeline.today,
    days: shown.map((day) => ({
      date: day.date,
      totalCents: day.projectedBalanceCents ?? undefined,
      inCents: sumByFlow(day.items, 'in'),
      outCents: sumByFlow(day.items, 'out'),
      items: day.items,
    })),
    overdue: timeline.overdue,
    undated: timeline.undated,
  };
}

/** The day the strip opens on: the first with something happening, otherwise the first one. */
export function pickDefaultDate(days: readonly StripDay[]): string {
  return (days.find((day) => day.items.length > 0) ?? days[0])?.date ?? '';
}
