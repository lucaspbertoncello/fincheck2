import type { ReactNode } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';

import { cx } from '#/utils/class-names.util.ts';

type CheckboxProps = {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  /** Visible label beside the box. Without it, pass `ariaLabel` (e.g. a selection-mode row). */
  children?: ReactNode;
  ariaLabel?: string;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  className?: string;
};

/** Checkbox (components.md 5.4): 20 × 20 box, radius 6, inside a 44 px touch target. */
export function Checkbox({
  isSelected,
  onChange,
  children,
  ariaLabel,
  isIndeterminate,
  isDisabled,
  className,
}: CheckboxProps) {
  return (
    <AriaCheckbox
      isSelected={isSelected}
      onChange={onChange}
      isIndeterminate={isIndeterminate}
      isDisabled={isDisabled}
      aria-label={children ? undefined : ariaLabel}
      className={cx(
        'group inline-flex min-h-ctl-touch cursor-pointer items-center gap-s12 text-list text-fg-primary data-[disabled]:cursor-default data-[disabled]:opacity-50',
        className,
      )}
    >
      <span className="grid size-ctl-touch shrink-0 place-items-center">
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-md border-[1.5px] border-fg-tertiary text-fg-on-accent transition-colors duration-(--duration-instant) group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-brand group-data-[indeterminate]:border-brand group-data-[indeterminate]:bg-brand group-data-[selected]:border-brand group-data-[selected]:bg-brand"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-4 opacity-0 group-data-[indeterminate]:opacity-100 group-data-[selected]:opacity-100"
          >
            <path
              d={isIndeterminate ? 'M6 12h12' : 'm5 12.5l4.5 4.5L19 7.5'}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      {children ? <span>{children}</span> : null}
    </AriaCheckbox>
  );
}
