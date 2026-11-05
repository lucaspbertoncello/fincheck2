import type { ReactNode } from 'react';
import type { ButtonProps as AriaButtonProps } from 'react-aria-components';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export type ButtonSize = 'md' | 'sm';

type ButtonBaseProps = Pick<
  AriaButtonProps,
  'onPress' | 'isDisabled' | 'type' | 'form' | 'autoFocus' | 'aria-expanded' | 'aria-controls'
> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Destructive action: disconnect, delete, restore backup. */
  danger?: boolean;
  /** Spinning icon and `loadingLabel`; the button stops answering to presses. */
  loading?: boolean;
  /** Label while loading ("Sincronizando..."). Defaults to the normal label. */
  loadingLabel?: string;
  /** Fills the width of the container (modal actions on the phone). */
  fullWidth?: boolean;
  className?: string;
};

type TextButtonProps = ButtonBaseProps & {
  iconOnly?: false;
  children: ReactNode;
  /** Leading 18 px icon. */
  icon?: IconName;
};

type IconButtonProps = ButtonBaseProps & {
  iconOnly: true;
  icon: IconName;
  /** Accessible name; an icon-only button has no visible text. */
  label: string;
  children?: never;
};

export type ButtonProps = TextButtonProps | IconButtonProps;
