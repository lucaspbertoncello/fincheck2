import { Button } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ArrowButtonProps = {
  direction: 'previous' | 'next';
  /** What the arrow does, for the screen reader ("Mês anterior"). */
  label: string;
  onPress: () => void;
  /**
   * At its end: dimmed and with no press, but still focusable (`aria-disabled`, not `disabled`), so
   * a keyboard user who pressed it up to the end keeps the focus instead of losing it.
   */
  isDisabled?: boolean;
  /** For an arrow beside a control that already takes the keys (the day slider). */
  excludeFromTabOrder?: boolean;
  /** Hidden below the desktop width (arrows that the finger replaces). */
  desktopOnly?: boolean;
  className?: string;
};

const ARROW =
  'group relative grid size-ctl-sm shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary outline-none transition-[background-color,color,transform] duration-(--duration-fast) after:absolute after:-inset-1.5 after:content-[""] data-[hovered]:bg-brand-weak data-[hovered]:text-brand data-[pressed]:scale-94 aria-disabled:pointer-events-none aria-disabled:opacity-40 data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand lg:size-8';

/**
 * The chevron button of every stepper (the month picker, the day slider, the card pager): 32 px (36
 * on the phone, with the touch area grown by 6 px), no fill or outline, the chevron nudges toward
 * its side on hover. The name is required, because the button has no text.
 */
export function ArrowButton({
  direction,
  label,
  onPress,
  isDisabled,
  excludeFromTabOrder,
  desktopOnly,
  className,
}: ArrowButtonProps) {
  const isPrevious = direction === 'previous';

  return (
    <Button
      aria-label={label}
      aria-disabled={isDisabled || undefined}
      excludeFromTabOrder={excludeFromTabOrder}
      onPress={isDisabled ? undefined : onPress}
      className={cx(ARROW, desktopOnly && 'max-lg:hidden', className)}
    >
      <Icon
        name={isPrevious ? 'chevron-left' : 'chevron-right'}
        size="md"
        className={cx(
          'transition-transform duration-(--duration-fast)',
          isPrevious
            ? 'group-data-[hovered]:-translate-x-px'
            : 'group-data-[hovered]:translate-x-px',
        )}
      />
    </Button>
  );
}
