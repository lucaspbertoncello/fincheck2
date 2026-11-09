import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';

// An item of the agenda as a chip or a line of the timeline. The amount is what is left to pay or
// to receive; of what happened it is what was paid or received (the expected amount when it was
// only marked as done). The states become the markers of the strip: happened, expected, partial and
// late.
export function buildTimelineItem(item: Agenda.Item, date: string | null): Timeline.Item {
  const happened = item.state === 'settled';

  return {
    key: item.key,
    source: item.source,
    flow: item.flow,
    title: item.title,
    amountCents: happened
      ? item.paidCents > 0
        ? item.paidCents
        : item.amountCents
      : item.remainingCents,
    state: happened
      ? 'happened'
      : item.state === 'overdue'
        ? 'late'
        : item.state === 'partial'
          ? 'partial'
          : 'expected',
    date,
  };
}
