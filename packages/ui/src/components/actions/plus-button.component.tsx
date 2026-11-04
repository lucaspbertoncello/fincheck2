import { Button, type ButtonProps } from 'react-aria-components';

import { Tooltip } from '#/components/overlays/tooltip.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type PlusButtonProps = Pick<ButtonProps, 'onPress'> & {
  /** What the "+" does on this screen ("Nova transação"); the button has no visible text. */
  label: string;
  /**
   * Rail form: a 40 px circle that fills the width it is given. It has no visible text, so it
   * carries a tip with `label` on hover and keyboard focus (the rail never opens).
   */
  compact?: boolean;
};

/** The universal "+": a 44 px circle in the button gradient, white plus, one per screen. */
export function PlusButton({ label, onPress, compact = false }: PlusButtonProps) {
  const button = (
    <Button
      aria-label={label}
      onPress={onPress}
      className={cx(
        'shrink-0 cursor-pointer bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-plus) outline-none transition-transform duration-(--duration-fast) ease-(--ease-standard) focus-ring data-[pressed]:scale-96',
        compact
          ? 'grid h-ctl-tab w-full place-items-center rounded-capsule'
          : 'grid size-ctl-touch place-items-center rounded-capsule',
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-icon" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Button>
  );

  return compact ? <Tooltip label={label}>{button}</Tooltip> : button;
}
