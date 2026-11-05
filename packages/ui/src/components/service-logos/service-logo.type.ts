import type { ServiceLogoSlug } from '#/components/service-logos/service-logo-art.constant.ts';

/** A recognized subscription service: its name and the logo file, `null` when there is none. */
export type ServiceLogoData = {
  name: string;
  slug: ServiceLogoSlug | null;
};
