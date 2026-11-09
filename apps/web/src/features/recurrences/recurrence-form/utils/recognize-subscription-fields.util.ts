import { recognizeServiceSlug } from '@fincheck/shared/recurrences/subscription-service/recognize-service-slug.util.ts';
import { OTHER_SERVICE } from '#/features/recurrences/recurrence-form/constants/other-service.constant.ts';
import type {
  RecurrenceFormValues,
  SubscriptionTouched,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';

/**
 * The subscription fields the typed name (and the extract text) point to: a known service turns
 * "É assinatura" on and fills the Serviço; a name that stops matching puts them back off and on
 * "Outro". A field Lucas already touched by hand is never overridden, and an income has none.
 * Returns the fields to change, or `null` when nothing changes.
 */
export function recognizeSubscriptionFields(
  values: RecurrenceFormValues,
  touched: SubscriptionTouched,
): Pick<RecurrenceFormValues, 'isSubscription' | 'serviceSlug'> | null {
  if (values.kind !== 'expense') return null;

  const slug = recognizeServiceSlug(values.name, values.matchText);
  const isSubscription = touched.isSubscription ? values.isSubscription : slug !== null;
  const serviceSlug = touched.serviceSlug ? values.serviceSlug : (slug ?? OTHER_SERVICE);

  if (isSubscription === values.isSubscription && serviceSlug === values.serviceSlug) return null;

  return { isSubscription, serviceSlug };
}
