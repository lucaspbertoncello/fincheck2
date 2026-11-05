import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// The name the bank printed. A bank Pix without it falls back to the statement text after "PIX ",
// so the seed has both a name and the missing-name case (manual transactions have none).
function counterpartyOf(tx: MockState.TransactionRecord): string | null {
  if (tx.bank?.counterparty) return tx.bank.counterparty;
  const match = /^PIX\s+(\S.*)$/i.exec(tx.description);

  return tx.origin === 'bank' && match?.[1] ? match[1] : null;
}

// The biggest Pix in one direction over the whole history. Ignored transactions and the ones the
// bank took back do not count; transfers between own accounts are not `expense` or `income`. The
// newest wins a tie.
export function findLargestPix(
  database: MockState.Database,
  direction: 'sent' | 'received',
): Profile.PixHighlight | null {
  const wantedNature = direction === 'sent' ? 'expense' : 'income';
  let best: MockState.TransactionRecord | null = null;

  for (const tx of database.transactions) {
    if (tx.method !== 'pix' || tx.nature !== wantedNature || !countsInAccounts(tx)) continue;
    const amount = Math.abs(tx.amountCents);
    if (amount === 0) continue;
    if (
      !best ||
      amount > Math.abs(best.amountCents) ||
      (amount === Math.abs(best.amountCents) && tx.occurredOn > best.occurredOn)
    )
      best = tx;
  }

  return best
    ? {
        amountCents: Math.abs(best.amountCents),
        counterparty: counterpartyOf(best),
        occurredOn: best.occurredOn,
        transactionId: best.id,
      }
    : null;
}
