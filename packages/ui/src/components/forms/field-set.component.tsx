import { useId, type ReactNode } from 'react';

import {
  FIELD_DESCRIPTION_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';
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
 * the same rhythm as `TextField` (label 14 secondary, 4 to the control, error 13 under it). The
 * spacing is padding on each part, not a `gap`, so a closed `Collapse` among the children leaves no hole.
 */
export function FieldSet({ label, aside, description, error, children, className }: FieldSetProps) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className={cx('flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-s8 pb-s4">
        <span id={labelId} className={FIELD_LABEL_CLASS}>
          {label}
        </span>
        {aside ? <span className="text-meta text-fg-tertiary">{aside}</span> : null}
      </div>
      {children}
      {description ? <p className={cx('pt-s4', FIELD_DESCRIPTION_CLASS)}>{description}</p> : null}
      <FieldErrorMessage error={error} inField={false} />
    </div>
  );
}
