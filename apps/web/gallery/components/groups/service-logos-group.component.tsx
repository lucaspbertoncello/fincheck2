import { ServiceLogo } from '@fincheck/ui';

import { SERVICE_PATTERNS } from '#/domain/recurrences/service-logo/constants/service-patterns.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';

// The order of BR-REC-017 ("Logo oficial"): video, music, AI.
const GALLERY_ORDER = [
  'Netflix',
  'YouTube Premium',
  'Max',
  'Disney+',
  'Prime Video',
  'Apple TV+',
  'Globoplay',
  'Paramount+',
  'Crunchyroll',
  'Star+',
  'Spotify',
  'YouTube Music',
  'Apple Music',
  'Deezer',
  'Amazon Music',
  'Tidal',
  'ChatGPT',
  'Claude',
  'Gemini',
  'DeepSeek',
  'GLM',
  'Perplexity',
  'Grok',
  'Mistral',
  'GitHub Copilot',
  'Midjourney',
];

const SERVICES = GALLERY_ORDER.map((name) => {
  const service = SERVICE_PATTERNS.find((item) => item.name === name);
  if (!service) throw new Error(`Gallery: ${name} is not in the service patterns`);

  return service;
});

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
