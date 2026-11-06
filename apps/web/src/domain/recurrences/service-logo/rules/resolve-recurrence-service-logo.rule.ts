import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';
import type { ServiceLogoData } from '@fincheck/ui';

import { buildServiceLogoData } from '#/domain/recurrences/service-logo/rules/build-service-logo-data.rule.ts';

type RecurrenceServiceFlag = {
  isSubscription: boolean;
  serviceSlug: SubscriptionService.Slug | null;
};

/**
 * The logo a recurrence draws (BR-REC-017): only a subscription with a service that has a logo file.
 * "Outro" (no service), a recurrence that is not a subscription and a service with no logo file give
 * `null`: the row then uses its category icon.
 */
export function resolveRecurrenceServiceLogo(
  recurrence: RecurrenceServiceFlag,
): ServiceLogoData | null {
  if (!recurrence.isSubscription || !recurrence.serviceSlug) return null;

  return buildServiceLogoData(recurrence.serviceSlug);
}
