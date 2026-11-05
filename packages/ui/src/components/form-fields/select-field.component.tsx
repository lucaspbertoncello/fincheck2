import {
  Button as AriaButton,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Text,
} from 'react-aria-components';

import type { ChoiceOption } from '#/components/form-fields/choice-option.type.ts';
import {
  FIELD_BOX_CLASS,
  FIELD_DESCRIPTION_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';

type SelectFieldProps = {
  label: string;
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (key: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  name?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Single-choice dropdown for 7 or more options (an account, a bank), in the same box as the text
 * field: 48 px, radius 12, the same single focus ring. The list is a glass popover with 44 px rows;
 * the chosen row shows a check. For fewer options prefer `ChoiceField`; for categories,
 * `CategoryPicker`.
 */
export function SelectField({
  label,
  options,
  value,
  onChange,
  placeholder = 'Escolher',
  description,
  error,
  name,
  isRequired,
  isDisabled,
  autoFocus,
  className,
}: SelectFieldProps) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
      placeholder={placeholder}
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      autoFocus={autoFocus}
      isInvalid={error ? true : undefined}
      className={cx('flex min-w-0 flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <AriaButton
        className={cx(
          FIELD_BOX_CLASS,
          'flex cursor-pointer items-center justify-between gap-s8 text-left data-[disabled]:cursor-default data-[pressed]:bg-subtle',
        )}
      >
        <SelectValue className="flex min-w-0 flex-1 items-center gap-s8 truncate data-[placeholder]:text-fg-tertiary" />
        <Icon name="chevron-down" size="sm" className="text-fg-secondary" />
      </AriaButton>
      {description ? (
        <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
          {description}
        </Text>
      ) : null}
      <FieldErrorMessage error={error} />
      <Popover className="popover-enter w-(--trigger-width) rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)">
        <ListBox className="max-h-72 overflow-auto p-s8 outline-none">
          {options.map((option) => (
            <ListBoxItem
              key={option.key}
              id={option.key}
              textValue={option.label}
              className="group flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s12 text-list text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle data-[selected]:text-brand"
            >
              {option.icon ? (
                <Icon name={option.icon} size="md" className="text-fg-secondary" />
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{option.label}</span>
                {option.hint ? (
                  <span className="truncate text-meta text-fg-secondary">{option.hint}</span>
                ) : null}
              </span>
              <Icon name="check" size="sm" className="invisible group-data-[selected]:visible" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
