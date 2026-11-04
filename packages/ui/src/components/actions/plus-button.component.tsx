import type { ReactNode } from 'react';
import { Button, type ButtonProps } from 'react-aria-components';

import { cx } from '#/utils/class-names.util.ts';

type PlusButtonProps = Pick<ButtonProps, 'onPress'> & {
  /** What the "+" does on this screen ("Nova transação"); the button has no visible text. */
  label: string;
  /**
   * Rail form: a 40 px circle that fills the width it is given, so it grows into a pill when the
   * container widens. `children` is the visible text, placed after the plus.
   */
  compact?: boolean;
  children?: ReactNode;
};

/** The universal "+": a 44 px circle in the button gradient, white plus, one per screen. */
export function PlusButton({ label, onPress, compact = false, children }: PlusButtonProps) {
  return (
    <Button
      aria-label={label}
      onPress={onPress}
      className={cx(
        'shrink-0 cursor-pointer bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-plus) outline-none transition-transform duration-(--duration-fast) ease-(--ease-standard) focus-ring data-[pressed]:scale-96',
        compact
          ? 'flex h-ctl-tab w-full items-center rounded-capsule text-list font-emphasis whitespace-nowrap'
          : 'grid size-ctl-touch place-items-center rounded-capsule',
      )}
    >
      <span className={compact ? 'grid w-ctl-tab shrink-0 place-items-center' : 'contents'}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-icon" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {children}
    </Button>
  );
}
