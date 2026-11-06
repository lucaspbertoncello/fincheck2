import type { ServiceLogoSlug } from '#/components/service-logos/service-logo-art.constant.ts';

/** A subscription service that has a logo file: its name and the logo. */
export type ServiceLogoData = {
  name: string;
  slug: ServiceLogoSlug;
};
