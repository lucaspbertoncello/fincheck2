import {
  SERVICE_LOGO_ART,
  type ServiceLogoSlug,
} from '#/components/service-logos/service-logo-art.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

/** Share of the circle the symbol takes (its 24 x 24 box), the same for every logo. */
const SYMBOL_SHARE = '56%';

type ServiceLogoProps = {
  /** The logo of the service, or `null` for a service with no logo file: the initial is drawn. */
  slug: ServiceLogoSlug | null;
  /** Name of the service, whose initial the circle writes when there is no logo. */
  name: string;
  className?: string;
};

/**
 * Logo of a subscription service in a circle (components.md 10.0): the same circle as the category
 * icon of a row (36 px on the phone, 40 px from the desktop), the symbol in the official color over
 * the subtle surface, or in the text color when the brand color is near black (contrast in both
 * themes). A service without a logo file writes its initial in the same circle. Decorative: the
 * row text names the service.
 */
export function ServiceLogo({ slug, name, className }: ServiceLogoProps) {
  const art = slug ? SERVICE_LOGO_ART[slug] : null;

  return (
    <span
      aria-hidden="true"
      data-service={slug ?? 'initial'}
      className={cx(
        'inline-grid size-9 shrink-0 place-items-center rounded-capsule bg-subtle lg:size-10',
        art?.ink ? 'text-fg-primary' : undefined,
        !art && 'font-title text-label font-heading text-fg-secondary',
        className,
      )}
      style={art && !art.ink ? { color: `#${art.hex}` } : undefined}
    >
      {art ? (
        <svg
          viewBox="0 0 24 24"
          focusable="false"
          fill="currentColor"
          style={{ width: SYMBOL_SHARE, height: SYMBOL_SHARE }}
        >
          <path d={art.path} />
        </svg>
      ) : (
        name.trim().slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
