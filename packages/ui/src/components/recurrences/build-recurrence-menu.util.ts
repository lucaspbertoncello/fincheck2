import type { OverflowMenuItem } from '#/components/menus/index.ts';
import { recurrenceActionLabel } from '#/components/recurrences/recurrence-action-label.util.ts';
import type {
  RecurrenceAction,
  RecurrenceFlow,
  RecurrenceStatus,
} from '#/components/recurrences/recurrence-status.type.ts';

function item(
  key: RecurrenceAction,
  flow: RecurrenceFlow,
  extra: Partial<OverflowMenuItem> = {},
): OverflowMenuItem {
  return { key, label: recurrenceActionLabel(key, flow), ...extra };
}

/**
 * Items of the row "…" menu: the occurrence actions first (mark, link, edit expected, dismiss the
 * month with undo, Q7), a divider, then the recurrence itself (edit, pause, delete).
 */
export function buildRecurrenceMenu(
  flow: RecurrenceFlow,
  status: RecurrenceStatus,
): OverflowMenuItem[] {
  const decided = status === 'received' || status === 'dismissed';
  const occurrence: OverflowMenuItem[] = [];

  if (!decided && status !== 'paid-unlinked') {
    occurrence.push(item('mark-done', flow, { icon: 'check' }));
  }
  if (!decided) {
    occurrence.push(item('link', flow, { icon: 'link' }));
    occurrence.push(item('edit-expected', flow, { icon: 'edit' }));
    occurrence.push(item('dismiss', flow, { icon: 'close' }));
  }
  if (status === 'dismissed') {
    occurrence.push(item('undismiss', flow, { icon: 'history' }));
  }

  return [
    ...occurrence,
    item('edit', flow, { icon: 'edit', separatorBefore: occurrence.length > 0 }),
    item('pause', flow, { icon: 'clock' }),
    item('delete', flow, { icon: 'trash', danger: true }),
  ];
}
