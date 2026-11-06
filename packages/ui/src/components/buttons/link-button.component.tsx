import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { buttonClassName } from '#/components/buttons/button-class.util.ts';
import type { ButtonSize, ButtonVariant } from '#/components/buttons/button.type.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading 18 px icon. */
  icon?: IconName;
  /** Trailing 18 px icon ("chevron-right" on "Ver mais"). */
  trailingIcon?: IconName;
  /** "_blank" opens another tab and adds `rel="noreferrer"`. */
  target?: '_blank';
  className?: string;
};

/**
 * A link that looks like a `Button` (components.md 5.1, Polimento 13): same pill, same sizes and
 * the same classes (`buttonClassName`), but a real anchor, so it navigates, opens in a new tab and
 * is announced as a link. Use it for "Reconectar no Open Finance", "Ver todas" and the like; a
 * press that only runs code stays a `Button`.
 */
export function LinkButton({
  href,
  children,
  variant = 'tertiary',
  size = 'sm',
  icon,
  trailingIcon,
  target,
  className,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === '_blank' ? 'noreferrer' : undefined}
      className={buttonClassName({
        variant,
        size,
        danger: false,
        iconOnly: false,
        fullWidth: false,
        className,
      })}
    >
      {icon ? <Icon name={icon} size="md" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size="md" /> : null}
    </Link>
  );
}
