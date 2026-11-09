import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// The name the bank printed, nothing else: no name (or an empty one) is null.
function counterpartyOf(tx: MockState.TransactionRecord): string | null {
  const counterparty = tx.bank?.counterparty?.trim() ?? '';

  return counterparty === '' ? null : counterparty;
}

// The biggest Pix in one direction over the whole history: the way of the money says the direction
// (out is sent, in is received), every nature counts but the transfers between own accounts and the
// payments of an invoice, and the ones that do not enter the accounts (ignored, taken back) do not.
// The newest wins a tie.
export function findLargestPix(
  database: MockState.Database,
  direction: 'sent' | 'received',
): Profile.PixHighlight | null {
  let best: MockState.TransactionRecord | null = null;

  for (const tx of database.transactions) {
    if (tx.method !== 'pix' || tx.nature === 'transfer' || tx.nature === 'invoice_payment')
      continue;
    if (!countsInAccounts(tx)) continue;
    if (direction === 'sent' ? tx.amountCents >= 0 : tx.amountCents <= 0) continue;
    const amount = Math.abs(tx.amountCents);
    if (
      !best ||
      amount > Math.abs(best.amountCents) ||
      (amount === Math.abs(best.amountCents) &&
        (tx.occurredOn > best.occurredOn || (tx.occurredOn === best.occurredOn && tx.id > best.id)))
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
