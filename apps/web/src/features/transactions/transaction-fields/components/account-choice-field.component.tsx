import { AccountChips } from '#/shared/components/accounts/account-chips.component.tsx';
import type { AccountChipOption } from '#/shared/components/accounts/account-chips.component.tsx';

type AccountChoiceFieldProps = {
  label?: string;
  accounts: readonly AccountChipOption[];
  value: string | null;
  onChange: (accountId: string) => void;
  error?: string;
  className?: string;
};

/** The account as a tap: chips with the bank mark, or a list when there are too many to show. */
export function AccountChoiceField({ label = 'Conta', ...props }: AccountChoiceFieldProps) {
  return <AccountChips label={label} {...props} />;
}
