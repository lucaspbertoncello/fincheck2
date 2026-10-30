import { useId, type ReactNode } from 'react';

import {
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type FieldSetProps = {
  /** Visible label above the control; names the group for assistive technology. */
  label: string;
  /** Right of the label, small ("opcional"). */
  aside?: ReactNode;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Label, control and error of a field that is not a single input (chips, date shortcuts, a picker):
 * the same rhythm as `TextField` (label 14 secondary, 4 to the control, error 13 under it).
 */
export function FieldSet({ label, aside, description, error, children, className }: FieldSetProps) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className={cx('flex flex-col gap-s4', className)}>
      <div className="flex items-baseline justify-between gap-s8">
        <span id={labelId} className={FIELD_LABEL_CLASS}>
          {label}
        </span>
        {aside ? <span className="text-meta text-fg-tertiary">{aside}</span> : null}
      </div>
      {children}
      {description ? <p className={FIELD_DESCRIPTION_CLASS}>{description}</p> : null}
      {error ? (
        <p role="alert" className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
