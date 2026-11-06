import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

/**
 * The payment method a recurrence is saved with, from the account it falls on: a credit card makes
 * it `credit`; any other account leaves the method alone (`undefined`). Being a subscription is no
 * longer tied to the card: it is the "É assinatura" flag (BR-REC-017).
 */
export function resolveRecurrenceMethod(
  accountId: string | null,
  accounts: readonly Pick<Account.Dto, 'id' | 'type'>[],
): 'credit' | undefined {
  const account = accounts.find((item) => item.id === accountId);

  return account?.type === 'credit_card' ? 'credit' : undefined;
}
