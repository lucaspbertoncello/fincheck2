import { Button, type ButtonProps } from 'react-aria-components';

import { cx } from '#/utils/class-names.util.ts';

const VARIANT_CLASS = {
  link: 'min-h-ctl-touch px-s4 text-label text-brand data-[hovered]:underline lg:min-h-ctl-sm',
  solid:
    'min-h-ctl-touch rounded-capsule bg-(image:--gradient-button) px-s16 text-label font-emphasis text-fg-on-accent shadow-(--shadow-button-inset) lg:min-h-ctl-sm data-[pressed]:scale-98',
} as const;

type CardActionProps = Pick<ButtonProps, 'onPress' | 'isDisabled'> & {
  variant: keyof typeof VARIANT_CLASS;
  children: string;
  className?: string;
};

/**
 * Text button of the bank cards, headless from React Aria. Local stand-in until the shared buttons
 * of `buttons/` are wired in; the card only needs a label and a callback.
 */
export function CardAction({ variant, children, className, onPress, isDisabled }: CardActionProps) {
  return (
    <Button
      onPress={onPress}
      isDisabled={isDisabled}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center outline-none transition-transform duration-(--duration-fast) ease-(--ease-standard) focus-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </Button>
  );
}
