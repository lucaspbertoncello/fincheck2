import type { ServiceLogoData } from '@fincheck/ui';

import { buildServiceLogoData } from '#/domain/recurrences/service-logo/rules/build-service-logo-data.rule.ts';
import { recognizeServiceSlug } from '@fincheck/shared/recurrences/subscription-service/recognize-service-slug.util.ts';

/**
 * The service a charge description points to, with its name and logo, or `null` when it names none
 * of the 25 or the one it names has no logo file. Same texts as `recognizeServiceSlug`.
 */
export function recognizeService(
  ...texts: readonly (string | null | undefined)[]
): ServiceLogoData | null {
  const slug = recognizeServiceSlug(...texts);

  return slug ? buildServiceLogoData(slug) : null;
}
