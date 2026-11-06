import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';
import type { ServiceLogoData } from '@fincheck/ui';

import { SERVICE_LOGO_SLUGS } from '#/domain/recurrences/service-logo/constants/service-logo-slugs.constant.ts';

/** The name and the logo a subscription service draws with. */
export function buildServiceLogoData(slug: SubscriptionService.Slug): ServiceLogoData {
  const service = SUBSCRIPTION_SERVICES.find((item) => item.slug === slug);

  return { name: service?.name ?? slug, slug: SERVICE_LOGO_SLUGS[slug] };
}
