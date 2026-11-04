import { Logo } from '@fincheck/ui';
import { Link } from 'react-aria-components';

type RailLogoProps = {
  homeHref: string;
};

/**
 * Top of the rail: the two cards of the logo sit in the icon column and the name of the brand is
 * revealed as the rail opens (the clip is a width that opens with it). It is also the slot the
 * splash flies into; `data-logo-folded` tells the splash to fade the name on landing, because the
 * closed rail only shows the cards.
 */
export function RailLogo({ homeHref }: RailLogoProps) {
  return (
    <Link
      href={homeHref}
      aria-label="Fincheck, Visão geral"
      className="mb-s8 flex h-ctl-tab shrink-0 items-center rounded-capsule outline-none focus-ring"
    >
      <span className="rail-logo-clip shrink-0">
        <span data-logo-slot data-logo-folded className="block w-max">
          <Logo />
        </span>
      </span>
    </Link>
  );
}
