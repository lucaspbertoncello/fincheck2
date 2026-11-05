import { BankAvatar, SelectField } from '@fincheck/ui';
import { FieldError, Label, Radio, RadioGroup } from 'react-aria-components';

import type { AccountChipOption } from '#/shared/types/account/account-chip-option.type.ts';

type AccountChipsProps = {
  label: string;
  accounts: readonly AccountChipOption[];
  value: string | null;
  onChange: (accountId: string) => void;
  error?: string;
  className?: string;
};

/** Up to this many accounts show as chips; beyond it a list (the same limit as the design system). */
const CHIP_LIMIT = 6;

/**
 * The account as a tap: chips that carry the bank mark (the same small circle the lists use) or the
 * wallet icon, so the bank is recognised before it is read. Radio semantics; the chosen chip takes
 * the weak accent fill and border with no change of weight. With 7 accounts or more, a list.
 */
export function AccountChips({
  label,
  accounts,
  value,
  onChange,
  error,
  className,
}: AccountChipsProps) {
  if (accounts.length > CHIP_LIMIT) {
    return (
      <SelectField
        label={label}
        options={accounts}
        value={value}
        onChange={onChange}
        placeholder="Escolher conta"
        error={error}
        className={className}
      />
    );
  }

  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      isInvalid={error ? true : undefined}
      className={`flex flex-col gap-s4 ${className ?? ''}`}
    >
      <Label className="text-label text-fg-secondary">{label}</Label>
      <div className="flex flex-wrap gap-s8">
        {accounts.map((account) => (
          <Radio
            key={account.key}
            value={account.key}
            className="focus-ring inline-flex h-ctl-tab max-w-full min-w-0 cursor-pointer items-center gap-s8 rounded-capsule border border-line pr-s16 pl-s8 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
          >
            <BankAvatar theme={account.theme} name={account.label} size={24} />
            <span className="truncate" title={account.label}>
              {account.label}
            </span>
          </Radio>
        ))}
      </div>
      <FieldError className="text-meta text-alert">{error}</FieldError>
    </RadioGroup>
  );
}
