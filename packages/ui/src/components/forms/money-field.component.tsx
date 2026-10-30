import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';

import { formatCentsInput } from '#/components/forms/format-cents-input.util.ts';
import {
  FIELD_BOX_CLASS,
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { parseCentsInput } from '#/components/forms/parse-cents-input.util.ts';
import { cx } from '#/utils/class-names.util.ts';

type MoneyFieldProps = {
  label: string;
  /** Integer cents. Zero shows the "0,00" placeholder. */
  cents: number;
  onChange: (cents: number) => void;
  /** "large" is the big typed amount: 40 px / 300 over a 2 px accent line, "R$" at 20. */
  size?: 'field' | 'large';
  error?: string;
  description?: string;
  name?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Money field with entry in cents: each digit typed shifts the amount ("1", "12", "123" show
 * 0,01, 0,12, 1,23), shown in pt-BR. Numeric keypad on the phone; pasting works (non-digits are
 * dropped).
 */
export function MoneyField({
  label,
  cents,
  onChange,
  size = 'field',
  error,
  description,
  name,
  isRequired,
  isDisabled,
  autoFocus,
  className,
}: MoneyFieldProps) {
  const large = size === 'large';

  return (
    <AriaTextField
      value={formatCentsInput(cents)}
      onChange={(text) => onChange(parseCentsInput(text))}
      inputMode="numeric"
      autoComplete="off"
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      autoFocus={autoFocus}
      isInvalid={error ? true : undefined}
      className={cx('flex flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <div
        className={cx(
          'flex items-baseline gap-s8',
          large
            ? 'border-b-2 border-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-brand'
            : 'relative items-center',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'text-fg-secondary',
            large ? 'text-money-sm' : 'pointer-events-none absolute left-s16 text-label',
          )}
        >
          R$
        </span>
        <Input
          placeholder="0,00"
          className={
            large
              ? 'money-numeric w-full min-w-0 bg-transparent py-s4 text-hero-mobile font-numeric text-fg-primary outline-none placeholder:text-fg-tertiary'
              : cx(FIELD_BOX_CLASS, 'money-numeric pl-s48')
          }
        />
      </div>
      {description ? (
        <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
          {description}
        </Text>
      ) : null}
      <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
    </AriaTextField>
  );
}
