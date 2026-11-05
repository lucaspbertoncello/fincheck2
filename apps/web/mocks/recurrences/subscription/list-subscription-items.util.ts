import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { buildSubscriptionItem } from '#mocks/recurrences/subscription/build-subscription-item.util.ts';
import { isSubscriptionRecurrence } from '#mocks/recurrences/subscription/is-subscription-recurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// The rows of the tab in a month: the active subscriptions by charge day, then the ended ones that
// charged after they ended.
export function listSubscriptionItems(
  database: MockState.Database,
  month: string,
): Subscription.Item[] {
  ensureOccurrences(database);
  const items: Subscription.Item[] = [];

  for (const recurrence of database.recurrences) {
    if (!isSubscriptionRecurrence(recurrence) || recurrence.startsMonth > month) continue;
    const item = buildSubscriptionItem(database, recurrence, month);
    if (item) items.push(item);
  }

  const ended = (item: Subscription.Item) =>
    item.recurrence.pausedAt !== null || item.recurrence.archivedAt !== null;

  return items.sort(
    (a, b) =>
      Number(ended(a)) - Number(ended(b)) ||
      a.chargeDay - b.chargeDay ||
      a.recurrence.name.localeCompare(b.recurrence.name, 'pt-BR', { sensitivity: 'base' }),
  );
}
