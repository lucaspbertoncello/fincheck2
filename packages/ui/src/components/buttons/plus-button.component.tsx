import { Button, type ButtonProps } from 'react-aria-components';

import { Tooltip } from '#/components/overlays/tooltip.component.tsx';

type PlusButtonProps = Pick<ButtonProps, 'onPress'> & {
  /** What the "+" does on this screen ("Nova transação"); the button has no visible text and shows this as its tip. */
  label: string;
};

/**
 * The universal "+": the floating button of the screen, a 56 px circle in the button gradient with
 * a white plus and the system shadow, one per screen. It has no visible text, so it carries a tip
 * with `label` on hover and keyboard focus, opening to the left (the button sits at the right edge
 * of the window). Where it sits (fixed, bottom right) is the shell's job, not the button's.
 */
export function PlusButton({ label, onPress }: PlusButtonProps) {
  return (
    <Tooltip label={label} placement="left">
      <Button
        aria-label={label}
        onPress={onPress}
        className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-capsule bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-plus) outline-none transition-transform duration-(--duration-fast) ease-(--ease-standard) focus-ring data-[pressed]:scale-96"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-icon-lg" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Button>
    </Tooltip>
  );
}
