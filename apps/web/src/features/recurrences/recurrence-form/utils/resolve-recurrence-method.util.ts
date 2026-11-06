import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

/**
 * The payment method a recurrence is saved with, from the account it falls on: a credit card makes
 * it `credit` (an expense on the card is a subscription, BR-REC-017); any other account leaves the
 * method alone (`undefined`).
 */
export function resolveRecurrenceMethod(
  accountId: string | null,
  accounts: readonly Pick<Account.Dto, 'id' | 'type'>[],
): 'credit' | undefined {
  const account = accounts.find((item) => item.id === accountId);

  return account?.type === 'credit_card' ? 'credit' : undefined;
}
