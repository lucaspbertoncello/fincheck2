import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

/** The kinds of account the person can create by hand. */
export const MANUAL_ACCOUNT_TYPES: readonly { type: Account.Type; label: string }[] = [
  { type: 'checking', label: 'Conta corrente' },
  { type: 'savings', label: 'Poupança' },
  { type: 'wallet', label: 'Carteira' },
  { type: 'credit_card', label: 'Cartão de crédito' },
];
