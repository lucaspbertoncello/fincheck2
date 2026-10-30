import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { ChoiceOption } from '@fincheck/ui';

const ICON_BY_TYPE = {
  checking: 'wallet',
  savings: 'wallet',
  wallet: 'coins',
  credit_card: 'card',
} as const satisfies Record<Account.Dto['type'], ChoiceOption['icon']>;

/** Accounts as quick choices: the name with the icon of its kind (card, wallet, cash). */
export function buildAccountChoices(
  accounts: readonly Pick<Account.Dto, 'id' | 'name' | 'type'>[],
): ChoiceOption[] {
  return accounts.map((account) => ({
    key: account.id,
    label: account.name,
    icon: ICON_BY_TYPE[account.type],
  }));
}
