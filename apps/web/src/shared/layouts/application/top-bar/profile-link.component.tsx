import { Icon } from '@fincheck/ui';
import { Link } from 'react-aria-components';

type ProfileLinkProps = {
  href: string;
  label: string;
  /** True on the Perfil screen: accent background and icon, as the gear on Configurações. */
  active: boolean;
};

/**
 * Perfil in the top bar of the phone (the bottom bar holds five items and has no room for it):
 * the person icon, 44 px, in the same cell as the gear beside it.
 */
export function ProfileLink({ href, label, active }: ProfileLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring grid size-ctl-touch cursor-pointer place-items-center rounded-capsule outline-none transition-colors duration-(--duration-fast) ${
        active ? 'bg-brand-weak text-brand' : 'text-fg-secondary data-[hovered]:bg-glass'
      }`}
    >
      <Icon name="user" />
    </Link>
  );
}
