import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { IconName } from '@fincheck/ui';

/** The kinds of account the person can create by hand, with the icon of their choice card. */
export const MANUAL_ACCOUNT_TYPES: readonly {
  type: Account.Type;
  label: string;
  icon: IconName;
}[] = [
  { type: 'checking', label: 'Conta corrente', icon: 'dollar' },
  { type: 'savings', label: 'Poupança', icon: 'coins' },
  { type: 'wallet', label: 'Carteira', icon: 'wallet' },
  { type: 'credit_card', label: 'Cartão de crédito', icon: 'card' },
];
