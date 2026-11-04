import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { BankAvatar, Icon, resolveBankThemeKey } from '@fincheck/ui';
import {
  Button as AriaButton,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components';

type BankOption = { value: Institution.Code; label: string };

type BankSelectProps = {
  label: string;
  /** The banks of the catalog plus "Outro", as `{ value, label }`. */
  options: readonly BankOption[];
  value: Institution.Code | '';
  onChange: (value: Institution.Code) => void;
  error?: string;
  isDisabled?: boolean;
};

const BOX_CLASS =
  'field-ring flex min-h-ctl-field w-full cursor-pointer items-center justify-between gap-s8 rounded-input border border-line bg-field px-s16 text-left text-body text-fg-primary outline-none data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[pressed]:bg-subtle';

/**
 * The bank as a select with its mark (the same circle the lists use) in the closed field and in
 * every row, so the person recognises the bank before reading it. It looks like the system
 * `SelectField` (48 px, radius 12, glass list with 44 px rows and a check); it is built here
 * because that one takes an icon name per row and not a bank mark. Typing jumps to the bank.
 */
export function BankSelect({
  label,
  options,
  value,
  onChange,
  error,
  isDisabled,
}: BankSelectProps) {
  return (
    <Select
      selectedKey={value === '' ? null : value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key) as Institution.Code);
      }}
      placeholder="Escolher o banco"
      isDisabled={isDisabled}
      isInvalid={error ? true : undefined}
      className="flex min-w-0 flex-col gap-s4"
    >
      <Label className="text-label text-fg-secondary">{label}</Label>
      <AriaButton className={BOX_CLASS}>
        <SelectValue className="flex min-w-0 flex-1 items-center gap-s12 data-[placeholder]:text-fg-tertiary">
          {({ selectedItem, isPlaceholder, defaultChildren }) => {
            const chosen = selectedItem as BankOption | null;
            if (isPlaceholder || !chosen) return defaultChildren;
            return (
              <>
                <BankAvatar
                  theme={resolveBankThemeKey(chosen.value)}
                  name={chosen.label}
                  size={24}
                />
                <span className="truncate">{chosen.label}</span>
              </>
            );
          }}
        </SelectValue>
        <Icon name="chevron-down" size="sm" className="shrink-0 text-fg-secondary" />
      </AriaButton>
      <FieldError className="text-meta text-alert">{error}</FieldError>
      <Popover className="popover-enter w-(--trigger-width) rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)">
        <ListBox
          items={options.map((option) => ({ ...option, id: option.value }))}
          className="max-h-72 overflow-auto p-s8 outline-none"
        >
          {(option) => (
            <ListBoxItem
              id={option.value}
              textValue={option.label}
              className="group flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s12 text-list text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle data-[selected]:text-brand"
            >
              <BankAvatar theme={resolveBankThemeKey(option.value)} name={option.label} size={24} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <Icon name="check" size="sm" className="invisible group-data-[selected]:visible" />
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}
