import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type SettingsLinkProps = {
  href: string;
  label: string;
  /** True on the settings page: accent background and icon. */
  active: boolean;
};

/** The gear: 40 px (44 on mobile); on hover it turns 45 degrees and gains a glass background. */
export function SettingsLink({ href, label, active }: SettingsLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group grid size-ctl-touch cursor-pointer place-items-center rounded-capsule outline-none transition-colors duration-(--duration-fast) lg:size-ctl-tab',
        active ? 'bg-brand-weak text-brand' : 'text-fg-secondary data-[hovered]:bg-glass',
      )}
    >
      <Icon
        name="settings"
        className="transition-transform duration-(--duration-slide) ease-(--ease-standard) group-data-[hovered]:rotate-45"
      />
    </Link>
  );
}
