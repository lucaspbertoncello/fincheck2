import { weekStartOf } from '#/components/day-strip/week-start-of.util.ts';
import type { DayStripDay, WeekSummary } from '#/components/day-strip/day-strip.type.ts';

/**
 * Groups the days (already in order) by week, Sunday to Saturday. The first week starts at the
 * first shown day, so it is the rest of the current week, not the whole one. The balance of a
 * week is the projected balance of its last day that has one.
 */
export function groupDaysByWeek<TItem>(
  days: readonly DayStripDay<TItem>[],
  today: string,
): WeekSummary<TItem>[] {
  const weeks = new Map<string, WeekSummary<TItem>>();

  for (const day of days) {
    const key = weekStartOf(day.date);
    const week = weeks.get(key) ?? {
      key,
      startDate: day.date,
      endDate: day.date,
      inCents: 0,
      outCents: 0,
      isCurrent: false,
      items: [],
    };

    weeks.set(key, {
      ...week,
      endDate: day.date,
      inCents: week.inCents + (day.inCents ?? 0),
      outCents: week.outCents + (day.outCents ?? 0),
      endBalanceCents: day.totalCents ?? week.endBalanceCents,
      isCurrent: week.isCurrent || day.date === today,
      items: [...week.items, ...day.items],
    });
  }

  return [...weeks.values()];
}
