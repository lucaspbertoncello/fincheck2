import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { ServiceLogo } from '@fincheck/ui';

import { buildServiceLogoData } from '#/domain/recurrences/service-logo/rules/build-service-logo-data.rule.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';

// The order of BR-REC-017 ("Logo oficial"): video, music, AI. It is the order of the shared list.
const SERVICES = SUBSCRIPTION_SERVICES.map((service) => buildServiceLogoData(service.slug));

function ServiceLogoGrid() {
  return (
    <ul className="m-0 grid w-full list-none grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-s8 p-0">
      {SERVICES.map((service) => (
        <li
          key={service.name}
          className="flex flex-col items-center gap-s8 rounded-input border border-line p-s12"
        >
          <ServiceLogo slug={service.slug} name={service.name} />
          <span className="text-caption text-center text-fg-primary">{service.name}</span>
          <span className="text-caption text-center text-fg-tertiary">
            {service.slug ?? 'inicial'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const SERVICE_LOGOS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'service-logo-grid',
    title: `ServiceLogo: os ${SERVICES.length} serviços (${SERVICES.filter((service) => service.slug).length} logos e ${SERVICES.filter((service) => !service.slug).length} iniciais)`,
    content: <ServiceLogoGrid />,
  },
];
