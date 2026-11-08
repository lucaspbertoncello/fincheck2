import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { Icon, ServiceLogo } from '@fincheck/ui';
import type { ChoiceOption, IconName } from '@fincheck/ui';

import { SERVICE_LOGO_SLUGS } from '#/domain/recurrences/service-logo/constants/service-logo-slugs.constant.ts';
import { OTHER_SERVICE } from '#/features/recurrences/recurrence-form/constants/other-service.constant.ts';

/** Fits the logo circle in the 48 px box of the field and the 44 px rows of the list. */
const MARK_CLASS = 'size-8! lg:size-8!';

/**
 * The options of the Serviço field: the 25 services in screen order, each with its logo, then
 * "Outro". A service with no logo file and "Outro" show the icon of the chosen category in the same
 * circle (never an initial), as the rows of the lists do, so every name starts at the same place.
 */
export function buildServiceOptions(categoryIcon: IconName = 'tag'): ChoiceOption[] {
  const categoryMark = (
    <span
      aria-hidden="true"
      className="inline-grid size-8 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary"
    >
      <Icon name={categoryIcon} size="sm" />
    </span>
  );

  return [
    ...SUBSCRIPTION_SERVICES.map((service): ChoiceOption => {
      const logo = SERVICE_LOGO_SLUGS[service.slug];

      return {
        key: service.slug,
        label: service.name,
        leading: logo ? <ServiceLogo slug={logo} className={MARK_CLASS} /> : categoryMark,
      };
    }),
    { key: OTHER_SERVICE, label: 'Outro', leading: categoryMark },
  ];
}
