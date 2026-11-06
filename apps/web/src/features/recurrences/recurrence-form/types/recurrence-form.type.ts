import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';

import type { OTHER_SERVICE } from '#/features/recurrences/recurrence-form/constants/other-service.constant.ts';

/** What is typed in the form. Numbers stay as text until the schema reads them. */
export type RecurrenceFormValues = {
  kind: Recurrence.Kind;
  name: string;
  amountCents: number;
  counterparty: string;
  matchText: string;
  /** Only income uses it; "" while none was chosen. */
  employmentRegime: '' | Recurrence.EmploymentRegime;
  categoryId: string | null;
  accountId: string | null;
  ruleType: Recurrence.DateRuleType;
  day: string;
  businessDayNumber: string;
  toleranceDays: string;
  /** Only "Dia fixo" uses it: what happens when the day falls on a weekend or a holiday. */
  nonBusinessDayShift: Recurrence.NonBusinessDayShift;
  maxPayments: string;
  applyFrom: Recurrence.ApplyFrom;
  /** "É assinatura" (BR-REC-017). Only an expense can be one. */
  isSubscription: boolean;
  /** The service of a subscription: a slug, or "other" for "Outro" (saved as `null`). */
  serviceSlug: SubscriptionService.Slug | typeof OTHER_SERVICE;
};

/** Which subscription fields Lucas already touched by hand: the typed name stops overriding them. */
export type SubscriptionTouched = {
  isSubscription: boolean;
  serviceSlug: boolean;
};

export type RecurrenceFormField =
  | 'name'
  | 'amountCents'
  | 'counterparty'
  | 'matchText'
  | 'day'
  | 'businessDayNumber'
  | 'toleranceDays'
  | 'maxPayments';

export type RecurrenceFormErrors = Partial<Record<RecurrenceFormField, string>>;

export type BuildBodyResult<TBody> =
  | { status: 'ok'; body: TBody }
  | { status: 'invalid'; errors: RecurrenceFormErrors }
  | { status: 'unchanged' };
