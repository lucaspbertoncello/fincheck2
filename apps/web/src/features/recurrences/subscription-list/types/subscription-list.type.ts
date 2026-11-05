import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import type { IconName, ServiceLogoData } from '@fincheck/ui';

/** The warning of a row: what happened and, when there is one, the button that answers it. */
export type SubscriptionAlertData = {
  kind: Subscription.AlertKind;
  text: string;
  /** "Atualizar valor", "Encerrar"; absent when there is nothing to do about it. */
  actionLabel?: string;
};

/** One subscription of the month, ready for `SubscriptionRow`. */
export type SubscriptionRowData = {
  recurrenceId: string;
  name: string;
  icon: IconName;
  /** The service the name or the matching text points to (its logo); null shows the category icon. */
  service: ServiceLogoData | null;
  /** "Roxinho · dia 12": the card and the day of the charge. */
  detail: string;
  status: Subscription.Status;
  /** Ended (paused or deleted) and still charging. */
  ended: boolean;
  amountCents: number;
  /** Under the amount: "Cobrada 05/11", "Em 3 dias". */
  statusNote: string;
  alert: SubscriptionAlertData | null;
  /** A mutation of this row is running. */
  pending: boolean;
};

/** One suggestion, ready for the banner. */
export type SubscriptionSuggestionData = {
  key: string;
  /** "Parece uma assinatura: Podcast Plus, R$ 19,90". */
  title: string;
  /** "Cobrada em 3 meses seguidos no Roxinho, a última em 12/10." */
  description: string;
  /** "Podcast Plus", for the toasts. */
  name: string;
  /** The service the description points to; null keeps the suggestion icon. */
  service: ServiceLogoData | null;
};

export type ActionErrorData = { message: string; onRetry: () => void };
