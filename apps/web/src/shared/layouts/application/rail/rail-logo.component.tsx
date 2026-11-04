import { Logo, Tooltip } from '@fincheck/ui';
import { Link } from 'react-aria-components';

type RailLogoProps = {
  homeHref: string;
};

/**
 * Top of the rail: the two cards of the logo, centered in the 40 px cell (the name of the brand
 * is clipped off, the rail never opens). It is also the slot the splash flies into;
 * `data-logo-folded` tells the splash to fade the name on landing, because only the cards stay.
 */
export function RailLogo({ homeHref }: RailLogoProps) {
  return (
    <Tooltip label="Fincheck, Visão geral">
      <Link
        href={homeHref}
        aria-label="Fincheck, Visão geral"
        className="grid size-ctl-tab shrink-0 place-items-center rounded-capsule outline-none focus-ring"
      >
        <span className="block w-7 overflow-hidden [clip-path:inset(0)] [contain:paint]">
          <span data-logo-slot data-logo-folded className="block w-max">
            <Logo />
          </span>
        </span>
      </Link>
    </Tooltip>
  );
}
