import type { ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

const VARIANT_CLASS = {
  primary: {
    default:
      'bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-button-inset) data-[hovered]:brightness-110',
    danger:
      'bg-(image:--gradient-danger) text-fg-on-accent dark:text-(--color-text-on-accent-solid) shadow-(--shadow-button-inset) data-[hovered]:brightness-110',
  },
  secondary: {
    default: 'border border-line text-fg-primary data-[hovered]:bg-subtle',
    danger: 'border border-line text-loss data-[hovered]:bg-loss-weak',
  },
  tertiary: {
    default: 'text-brand data-[hovered]:bg-brand-weak',
    danger: 'text-loss data-[hovered]:bg-loss-weak',
  },
} as const;

const SIZE_CLASS = {
  md: 'h-ctl-touch px-s16',
  /** 36 px tall; the touch area grows to 44 px with a pseudo-element. */
  sm: 'h-ctl-sm px-s12 before:absolute before:inset-x-0 before:-inset-y-s4 before:content-[""]',
} as const;

const ICON_ONLY_SIZE_CLASS = {
  md: 'size-ctl-touch',
  sm: 'size-ctl-sm before:absolute before:-inset-s4 before:content-[""]',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASS;
export type ButtonSize = keyof typeof SIZE_CLASS;

type ButtonBaseProps = Pick<
  AriaButtonProps,
  'onPress' | 'isDisabled' | 'type' | 'form' | 'autoFocus'
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

/**
 * Pill button (components.md 5.1): primary gradient, secondary outline, tertiary text. Headless
 * React Aria button for focus, keyboard and press; 44 px tall (36 px `sm` with a 44 px touch area).
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    danger = false,
    loading = false,
    loadingLabel,
    fullWidth = false,
    className,
    onPress,
    isDisabled,
    type = 'button',
    form,
    autoFocus,
  } = props;

  const icon: IconName | undefined = loading && !props.icon ? 'sync' : props.icon;
  const text = props.iconOnly ? null : loading && loadingLabel ? loadingLabel : props.children;

  return (
    <AriaButton
      type={type}
      form={form}
      autoFocus={autoFocus}
      onPress={onPress}
      isDisabled={isDisabled}
      isPending={loading}
      aria-label={props.iconOnly ? props.label : undefined}
      className={cx(
        'focus-ring relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-s8 rounded-capsule text-label font-emphasis whitespace-nowrap select-none',
        'transition-transform duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96',
        'data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[pending]:cursor-progress',
        props.iconOnly ? ICON_ONLY_SIZE_CLASS[size] : SIZE_CLASS[size],
        VARIANT_CLASS[variant][danger ? 'danger' : 'default'],
        fullWidth && 'w-full',
        className,
      )}
    >
      {icon ? (
        <Icon
          name={icon}
          size={props.iconOnly ? 'base' : 'md'}
          className={cx(loading && 'animate-spin')}
        />
      ) : null}
      {text}
    </AriaButton>
  );
}
