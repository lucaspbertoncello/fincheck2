import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';

/** R2: "Saldo parcial: falta o saldo do Nubank". Undefined when every balance is known. */
export function buildPartialNotice(
  freeBalance: FreeBalance.Dto,
  accounts: readonly Account.Dto[],
): string | undefined {
  if (!freeBalance.isPartial) return undefined;
  const names = freeBalance.accountsWithoutBalance.map(
    (id) => accounts.find((account) => account.id === id)?.name ?? 'uma conta',
  );
  if (names.length === 0) return 'Saldo parcial: falta o saldo de uma conta';
  return `Saldo parcial: falta o saldo ${names.length > 1 ? 'das contas' : 'do'} ${names.join(', ')}`;
}
