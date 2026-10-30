import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

const SUBTITLE: Record<Account.Type, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Dinheiro em espécie',
  credit_card: 'Cartão de crédito',
};

/** The line under the account name. */
export function buildAccountSubtitle(type: Account.Type): string {
  return SUBTITLE[type];
}
