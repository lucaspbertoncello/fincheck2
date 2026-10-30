import { Switch as AriaSwitch } from 'react-aria-components';

import { cx } from '#/utils/class-names.util.ts';

type SwitchProps = {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  /** Visible label beside the switch. Without it, pass `ariaLabel`. */
  label?: string;
  /** Accessible name when there is no visible label ("Regra ativa"). */
  ariaLabel?: string;
  isDisabled?: boolean;
  className?: string;
};

/** On/off switch (components.md 5.4): 40 × 24 track in a 52 × 44 touch target, 160 ms. */
export function Switch({
  isSelected,
  onChange,
  label,
  ariaLabel,
  isDisabled,
  className,
}: SwitchProps) {
  return (
    <AriaSwitch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={label ? undefined : ariaLabel}
      className={cx(
        'group inline-flex min-h-ctl-touch cursor-pointer items-center gap-s12 text-list text-fg-primary data-[disabled]:cursor-default data-[disabled]:opacity-50',
        className,
      )}
    >
      <span className="grid h-ctl-touch w-13 shrink-0 place-items-center">
        <span
          aria-hidden="true"
          className="focus-ring-group relative block h-6 w-10 rounded-capsule bg-fg-tertiary transition-colors duration-(--duration-fast) ease-(--ease-standard) group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-brand group-data-[selected]:bg-brand"
        >
          <span className="absolute top-0.5 left-0 block size-5 translate-x-0.5 rounded-capsule bg-white shadow-(--shadow-knob) transition-transform duration-(--duration-fast) ease-(--ease-standard) group-data-[selected]:translate-x-4.5" />
        </span>
      </span>
      {label ? <span>{label}</span> : null}
    </AriaSwitch>
  );
}
