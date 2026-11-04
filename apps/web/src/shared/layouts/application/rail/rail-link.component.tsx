import { Icon, Tooltip, type IconName } from '@fincheck/ui';
import { Link } from 'react-aria-components';

type RailLinkProps = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  /** The sliding capsule that follows the page transition; only the five tabs have it. */
  slides?: boolean;
  /** The gear turns 45 degrees on hover, as it did on the top bar. */
  turnsOnHover?: boolean;
};

/**
 * One icon of the rail: a 40 px cell with the name in a tip (hover and keyboard focus) and in
 * `aria-label`. The active one carries the capsule behind the icon; it is a circle, because the
 * rail never opens.
 */
export function RailLink({
  href,
  label,
  icon,
  active,
  slides = false,
  turnsOnHover = false,
}: RailLinkProps) {
  return (
    <Tooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`group/link relative grid size-ctl-tab shrink-0 cursor-pointer place-items-center rounded-capsule no-underline outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) focus-ring ${
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
        <Icon
          name={icon}
          className={`relative transition-[color,transform] ease-(--ease-standard) ${
            turnsOnHover
              ? 'duration-(--duration-slide) group-data-[hovered]/link:rotate-45'
              : 'duration-(--duration-fast)'
          } ${active ? 'text-brand' : 'text-fg-secondary group-data-[hovered]/link:text-fg-primary'}`}
        />
      </Link>
    </Tooltip>
  );
}
