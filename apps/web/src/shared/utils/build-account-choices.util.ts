import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { resolveBankThemeKey } from '@fincheck/ui';

import type { AccountChipOption } from '#/shared/components/accounts/account-chips.component.tsx';

const ICON_BY_TYPE = {
  checking: 'wallet',
  savings: 'wallet',
  wallet: 'coins',
  credit_card: 'card',
} as const satisfies Record<Account.Dto['type'], AccountChipOption['icon']>;

/**
 * Accounts as quick choices: the name with the bank mark (the wallet icon for the wallet). The icon
 * of the kind stays for the list that takes over when there are more than six.
 */
export function buildAccountChoices(
  accounts: readonly Pick<Account.Dto, 'id' | 'name' | 'type' | 'institutionCode'>[],
): AccountChipOption[] {
  return accounts.map((account) => ({
    key: account.id,
    label: account.name,
    icon: ICON_BY_TYPE[account.type],
    theme: account.type === 'wallet' ? 'wallet' : resolveBankThemeKey(account.institutionCode),
  }));
}
