import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type SettingRowProps = {
  label: string;
  /** Line under the label (13 px): what it does or its current state. */
  description?: ReactNode;
  /** The control at the right: a `Switch`, `SegmentedControl` or `Button`. */
  control?: ReactNode;
  /** On the phone the control drops under the text (wide controls); the desktop keeps it at the right. */
  stackOnPhone?: boolean;
  className?: string;
};

/**
 * Setting row (components.md 15): label in 500 with the description under it, the control at the
 * right, a rule on top and 16 of padding. The first row of a group loses the rule.
 */
export function SettingRow({
  label,
  description,
  control,
  stackOnPhone = false,
  className,
}: SettingRowProps) {
  return (
    <div
      className={cx(
        'flex justify-between gap-s16 border-t border-line py-s16 first:border-t-0',
        stackOnPhone ? 'max-lg:flex-col lg:items-center' : 'items-center',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-s4">
        <p className="text-body font-emphasis text-fg-primary">{label}</p>
        {description ? <p className="text-meta text-fg-secondary">{description}</p> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center gap-s8">{control}</div> : null}
    </div>
  );
}
