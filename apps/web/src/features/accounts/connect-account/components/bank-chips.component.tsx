import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { BankAvatar, resolveBankThemeKey } from '@fincheck/ui';
import { Label, Radio, RadioGroup } from 'react-aria-components';

type BankChipsProps = {
  label: string;
  /** The banks of the catalog plus "Outro", as `{ value, label }`. */
  options: readonly { value: Institution.Code; label: string }[];
  value: Institution.Code | '';
  onChange: (value: Institution.Code) => void;
  error?: string;
  isDisabled?: boolean;
};

/**
 * The bank as chips that carry its mark (the same circle the lists use), so the person recognises
 * the bank before reading it. Radio semantics; "Outro" gets the neutral letter. The chosen chip
 * takes the weak accent fill and border, with no change of weight, so nothing shifts.
 */
export function BankChips({ label, options, value, onChange, error, isDisabled }: BankChipsProps) {
  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as Institution.Code)}
      isDisabled={isDisabled}
      className="flex flex-col gap-s4"
    >
      <Label className="text-label text-fg-secondary">{label}</Label>
      <div className="flex flex-wrap gap-s8">
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            className="focus-ring inline-flex h-ctl-sm cursor-pointer items-center gap-s8 rounded-capsule border border-line pr-s12 pl-s4 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
          >
            <BankAvatar theme={resolveBankThemeKey(option.value)} name={option.label} size={24} />
            {option.label}
          </Radio>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-meta text-alert">
          {error}
        </p>
      ) : null}
    </RadioGroup>
  );
}
