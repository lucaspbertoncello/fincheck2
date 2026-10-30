import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';

import {
  FIELD_BOX_CLASS,
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type TextFieldProps = {
  /** Visible label above the field. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Error message; shown right under the field and marks it invalid. */
  error?: string;
  /** Helper text under the field. */
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';
  autoComplete?: string;
  name?: string;
  maxLength?: number;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/** Text field (components.md 5.4): label above, error under, 16 px text, 48 px tall. */
export function TextField({
  label,
  value,
  onChange,
  error,
  description,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  name,
  maxLength,
  isRequired,
  isDisabled,
  autoFocus,
  className,
}: TextFieldProps) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      name={name}
      maxLength={maxLength}
      isRequired={isRequired}
      isDisabled={isDisabled}
      autoFocus={autoFocus}
      isInvalid={error ? true : undefined}
      className={cx('flex flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <Input placeholder={placeholder} className={FIELD_BOX_CLASS} />
      {description ? (
        <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
          {description}
        </Text>
      ) : null}
      <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
    </AriaTextField>
  );
}
