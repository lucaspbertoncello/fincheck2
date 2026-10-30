import { ChoiceField, SelectField } from '@fincheck/ui';
import type { ChoiceOption } from '@fincheck/ui';

type AccountChoiceProps = {
  label: string;
  accounts: readonly ChoiceOption[];
  value: string | null;
  onChange: (accountId: string) => void;
};

const MAX_CHIPS = 6;

/** The account as chips while there are few (one tap), as a list from 7 on. */
export function AccountChoice({ label, accounts, value, onChange }: AccountChoiceProps) {
  if (accounts.length > MAX_CHIPS) {
    return (
      <SelectField
        label={label}
        options={accounts}
        value={value}
        onChange={onChange}
        placeholder="Escolher conta"
      />
    );
  }

  return <ChoiceField label={label} options={accounts} value={value} onChange={onChange} />;
}
