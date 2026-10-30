import { FieldError, Input, Label, TextField as AriaTextField } from 'react-aria-components';

import {
  FIELD_BOX_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type EditDateFieldProps = {
  label: string;
  /** Business date, `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
};

/** Date field of the edit form: the browser's date picker (16 px text, 48 px tall) with label and error. */
export function EditDateField({ label, value, onChange, error, className }: EditDateFieldProps) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      type="date"
      isInvalid={error ? true : undefined}
      className={cx('flex flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <Input className={cx(FIELD_BOX_CLASS, 'tabular-nums')} />
      <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
    </AriaTextField>
  );
}
