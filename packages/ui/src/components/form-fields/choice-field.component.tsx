import { FieldError, Label, Radio, RadioGroup, Text } from 'react-aria-components';

import type { ChoiceOption } from '#/components/form-fields/choice-option.type.ts';
import {
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { SegmentedControl } from '#/components/forms/segmented-control.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ChoiceFieldProps = {
  label: string;
  options: readonly ChoiceOption[];
  /** Key of the chosen option; null shows none chosen. */
  value: string | null;
  onChange: (key: string) => void;
  /**
   * "chips" wraps pill choices (3 to 6 options, a payment method, an account); "segmented" is one
   * equal-width track (2 to 3 short options, a frequency).
   */
  variant?: 'chips' | 'segmented';
  description?: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
};

/**
 * A short list of options shown, not hidden in a dropdown: the reader sees all of them at once and
 * picks with one tap. Radio semantics (arrows move the choice, one is chosen). The chosen chip gets
 * the weak accent fill, the accent border and text; weight and border width never change, so
 * nothing shifts.
 */
export function ChoiceField({
  label,
  options,
  value,
  onChange,
  variant = 'chips',
  description,
  error,
  isRequired,
  isDisabled,
  className,
}: ChoiceFieldProps) {
  if (variant === 'segmented') {
    return (
      <div className={cx('flex flex-col gap-s4', className)}>
        <span className={FIELD_LABEL_CLASS} aria-hidden="true">
          {label}
        </span>
        <SegmentedControl
          label={label}
          options={options.map(({ key, label: optionLabel, icon }) => ({
            key,
            label: optionLabel,
            icon,
          }))}
          value={value ?? ''}
          onChange={onChange}
          isDisabled={isDisabled}
        />
        {description ? <p className={FIELD_DESCRIPTION_CLASS}>{description}</p> : null}
        {error ? (
          <p role="alert" className={FIELD_ERROR_CLASS}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={error ? true : undefined}
      className={cx('flex flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <div className="flex flex-wrap gap-s8">
        {options.map((option) => (
          <Radio
            key={option.key}
            value={option.key}
            className={cx(
              'focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s8 rounded-capsule border border-line px-s16 text-label whitespace-nowrap text-fg-primary',
              'transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96',
              'data-[hovered]:bg-subtle data-[disabled]:cursor-default data-[disabled]:opacity-50',
              'data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand',
            )}
          >
            {option.icon ? <Icon name={option.icon} size="md" /> : null}
            {option.label}
          </Radio>
        ))}
      </div>
      {description ? (
        <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
          {description}
        </Text>
      ) : null}
      <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
    </RadioGroup>
  );
}
