import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { CounterpartOption } from '@fincheck/ui';

import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import { formatShortDate } from '#/features/transactions/transaction-list/utils/format-day-heading.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

const MAX_OPTIONS = 6;

/**
 * Candidates for the other leg of a transfer: a transaction of another account, with the opposite
 * sign and the same value, not ignored. The one already linked comes first.
 */
export function buildCounterpartOptions(
  transaction: Transaction.Dto,
  candidates: readonly Transaction.Dto[],
  lookups: TransactionLookups,
): CounterpartOption[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== transaction.id &&
        candidate.accountId !== transaction.accountId &&
        candidate.ignoredAt === null &&
        candidate.amountCents === -transaction.amountCents,
    )
    .sort(
      (a, b) =>
        Number(b.id === transaction.transferCounterpartId) -
        Number(a.id === transaction.transferCounterpartId),
    )
    .slice(0, MAX_OPTIONS)
    .map((candidate) => ({
      id: candidate.id,
      label: `${candidate.description} (${lookups.accounts.get(candidate.accountId)?.name ?? 'outra conta'}), ${formatShortDate(candidate.occurredOn)}, ${formatMoney(Math.abs(candidate.amountCents))}`,
    }));
}
