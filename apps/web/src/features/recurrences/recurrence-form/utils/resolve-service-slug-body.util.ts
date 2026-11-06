import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';

import { OTHER_SERVICE } from '#/features/recurrences/recurrence-form/constants/other-service.constant.ts';

/** The service as the API stores it: the slug, or `null` for "Outro". */
export function resolveServiceSlugBody(
  serviceSlug: SubscriptionService.Slug | typeof OTHER_SERVICE,
): SubscriptionService.Slug | null {
  return serviceSlug === OTHER_SERVICE ? null : serviceSlug;
}
