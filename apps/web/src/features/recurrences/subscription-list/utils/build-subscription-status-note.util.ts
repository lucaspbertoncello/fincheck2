import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { daysBetween } from '#/shared/utils/date/days-between.util.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

/** The second line of the amount column: when it was charged, or when it is expected. */
export function buildSubscriptionStatusNote(item: Subscription.Item, today: string): string {
  const { occurrence } = item.recurrence;

  if (item.alert?.kind === 'charged_after_end') {
    return `Cobrada ${formatShortDate(item.alert.occurredOn)}`;
  }
  if (item.status === 'charged') {
    const payment = occurrence?.payments.at(-1);

    return payment ? `Cobrada ${formatShortDate(payment.occurredOn)}` : 'Cobrada neste mês';
  }
  if (!occurrence?.expectedOn) return `Todo dia ${item.chargeDay}`;
  if (item.status === 'missed') return `Esperada ${formatShortDate(occurrence.expectedOn)}`;

  const days = daysBetween(today, occurrence.expectedOn);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days > 1) return `Em ${days} dias`;

  return `Esperada até ${formatShortDate(occurrence.windowEndOn)}`;
}
