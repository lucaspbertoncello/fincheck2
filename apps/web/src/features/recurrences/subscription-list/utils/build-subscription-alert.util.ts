import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import type { SubscriptionAlertData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';
import { formatMoneyText } from '#/features/recurrences/subscription-list/utils/format-money-text.util.ts';

/** The sentence and the button of a row's warning (BR-REC-017). */
export function buildSubscriptionAlert(
  item: Subscription.Item,
  hidden: boolean,
): SubscriptionAlertData | null {
  const { alert } = item;
  if (!alert) return null;

  switch (alert.kind) {
    case 'price_changed':
      return {
        kind: alert.kind,
        text: `Subiu de ${formatMoneyText(alert.fromCents, hidden)} para ${formatMoneyText(alert.toCents, hidden)}`,
        actionLabel: 'Atualizar valor',
      };
    case 'missed':
      return { kind: alert.kind, text: 'Não cobrou este mês. Cancelou?', actionLabel: 'Encerrar' };
    case 'charged_after_end':
      return {
        kind: alert.kind,
        text: `${item.recurrence.name} cobrou ${formatMoneyText(alert.amountCents, hidden)} depois de encerrada`,
      };
  }
}
