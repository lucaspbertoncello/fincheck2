import { ChoiceField, SelectField, type ChoiceOption } from '@fincheck/ui';

/** Up to this many accounts show as chips; beyond it a list (the same limit as the design system). */
const CHIP_LIMIT = 6;

type AccountChoiceFieldProps = {
  label?: string;
  accounts: readonly ChoiceOption[];
  value: string | null;
  onChange: (accountId: string) => void;
  error?: string;
  className?: string;
};

/** The account as a tap: chips with the kind's icon, or a list when there are too many to show. */
export function AccountChoiceField({
  label = 'Conta',
  accounts,
  value,
  onChange,
  error,
  className,
}: AccountChoiceFieldProps) {
  if (accounts.length > CHIP_LIMIT) {
    return (
      <SelectField
        label={label}
        options={accounts}
        value={value}
        onChange={onChange}
        error={error}
        className={className}
      />
    );
  }

  return (
    <ChoiceField
      label={label}
      options={accounts}
      value={value}
      onChange={onChange}
      error={error}
      className={className}
    />
  );
}
