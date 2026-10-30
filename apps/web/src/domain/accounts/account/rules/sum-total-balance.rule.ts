import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

/** Total of the balances of the active accounts that have one; cards and archived ones stay out. */
export function sumTotalBalance(accounts: readonly Account.Dto[]): number {
  return accounts
    .filter((account) => account.type !== 'credit_card' && !account.archivedAt)
    .reduce((total, account) => total + (account.balanceCents ?? 0), 0);
}
