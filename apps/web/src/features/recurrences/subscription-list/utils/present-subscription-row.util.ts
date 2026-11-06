import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { resolveRecurrenceServiceLogo } from '#/domain/recurrences/service-logo/rules/resolve-recurrence-service-logo.rule.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import type { SubscriptionRowData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';
import { buildSubscriptionAlert } from '#/features/recurrences/subscription-list/utils/build-subscription-alert.util.ts';
import { buildSubscriptionStatusNote } from '#/features/recurrences/subscription-list/utils/build-subscription-status-note.util.ts';

type RowContext = {
  /** Account id -> name. */
  accountNames: ReadonlyMap<string, string>;
  /** Category id -> icon name of the category set. */
  categoryIcons: ReadonlyMap<string, string>;
  today: string;
  hidden: boolean;
  /** Recurrence id whose mutation is running. */
  pendingKey: string | null;
};

/** A subscription of the month as the data of a row. */
export function presentSubscriptionRow(
  item: Subscription.Item,
  context: RowContext,
): SubscriptionRowData {
  const { recurrence } = item;
  const card = recurrence.accountId ? context.accountNames.get(recurrence.accountId) : undefined;
  const categoryIcon = recurrence.categoryId
    ? context.categoryIcons.get(recurrence.categoryId)
    : undefined;
  const ended = recurrence.pausedAt !== null || recurrence.archivedAt !== null;

  return {
    recurrenceId: recurrence.id,
    name: recurrence.name,
    icon: mapCategoryIcon(categoryIcon, 'subscription'),
    service: resolveRecurrenceServiceLogo(recurrence),
    detail: [card, `dia ${item.chargeDay}`].filter(Boolean).join(' · '),
    status: item.status,
    ended,
    // Charged this month (or after the end): what the card was charged, so a price change shows
    // the new value next to "Cobrada". Not charged yet: what is expected.
    amountCents:
      ended || item.status === 'charged'
        ? (item.lastChargeCents ?? recurrence.expectedAmountCents)
        : recurrence.expectedAmountCents,
    statusNote: buildSubscriptionStatusNote(item, context.today),
    alert: buildSubscriptionAlert(item, context.hidden),
    pending: context.pendingKey === recurrence.id,
  };
}
