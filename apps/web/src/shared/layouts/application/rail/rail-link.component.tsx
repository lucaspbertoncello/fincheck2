import { Icon, type IconName } from '@fincheck/ui';
import type { CSSProperties } from 'react';
import { Link } from 'react-aria-components';

type RailLinkProps = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  /** Where the label sits in the staggered entrance (0 comes in first). */
  order: number;
  /** The sliding capsule that follows the page transition; only the five tabs have it. */
  slides?: boolean;
  /** The gear turns 45 degrees on hover, as it did on the top bar. */
  turnsOnHover?: boolean;
};

/**
 * One row of the rail: a 40 px icon cell that never moves, then the label, which is only seen
 * when the rail is open. The active row carries the capsule behind both; it fills the row, so it
 * is a circle on the closed rail and stretches into a pill as the rail opens.
 */
export function RailLink({
  href,
  label,
  icon,
  active,
  order,
  slides = false,
  turnsOnHover = false,
}: RailLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group/link relative flex h-ctl-tab shrink-0 cursor-pointer items-center rounded-capsule text-list font-emphasis tracking-(--letter-spacing-row-name) whitespace-nowrap no-underline outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) focus-ring ${
        active
          ? 'text-fg-primary'
          : 'text-fg-secondary data-[hovered]:bg-subtle data-[hovered]:text-fg-primary'
      }`}
    >
      {active ? (
        <span
          aria-hidden="true"
          className={`${slides ? 'tab-indicator ' : ''}absolute inset-0 rounded-capsule bg-brand-weak`}
        />
      ) : null}
      <span className="relative grid w-ctl-tab shrink-0 place-items-center">
        <Icon
          name={icon}
          className={`transition-[color,transform] ease-(--ease-standard) ${
            turnsOnHover
              ? 'duration-(--duration-slide) group-data-[hovered]/link:rotate-45'
              : 'duration-(--duration-fast)'
          } ${active ? 'text-brand' : 'text-fg-secondary group-data-[hovered]/link:text-fg-primary'}`}
        />
      </span>
      <span className="rail-label relative pr-s12" style={{ '--rail-i': order } as CSSProperties}>
        {label}
      </span>
    </Link>
  );
}
