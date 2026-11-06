import type { ButtonSize, ButtonVariant } from '#/components/buttons/button.type.ts';
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
} as const satisfies Record<ButtonVariant, unknown>;

const SIZE_CLASS = {
  md: 'h-ctl-touch px-s16',
  /** 36 px tall; the touch area grows to 44 px with a pseudo-element. */
  sm: 'h-ctl-sm px-s12 before:absolute before:inset-x-0 before:-inset-y-s4 before:content-[""]',
} as const satisfies Record<ButtonSize, unknown>;

const ICON_ONLY_SIZE_CLASS = {
  md: 'size-ctl-touch',
  sm: 'size-ctl-sm before:absolute before:-inset-s4 before:content-[""]',
} as const satisfies Record<ButtonSize, unknown>;

type ButtonClassOptions = {
  variant: ButtonVariant;
  size: ButtonSize;
  danger: boolean;
  iconOnly: boolean;
  fullWidth: boolean;
  className?: string;
};

/** The one source of the pill look: `Button` and `LinkButton` both take their classes from here. */
export function buttonClassName({
  variant,
  size,
  danger,
  iconOnly,
  fullWidth,
  className,
}: ButtonClassOptions): string {
  return cx(
    'focus-ring relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-s8 rounded-capsule text-label font-emphasis whitespace-nowrap no-underline select-none',
    'transition-transform duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96',
    'data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[pending]:cursor-progress',
    iconOnly ? ICON_ONLY_SIZE_CLASS[size] : SIZE_CLASS[size],
    VARIANT_CLASS[variant][danger ? 'danger' : 'default'],
    fullWidth && 'w-full',
    className,
  );
}
