import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import { dayNumber } from '#/shared/date/day-number.util.ts';

// What each transaction that the Pluggy sent is, in Fincheck (`domain model.md` 4.8), by this order:
//
// 1. the id of the Pluggy (the link already exists);
// 2. the `providerId` of Open Finance, among the ones that vanished from this round (the Pluggy
//    erased and recreated the transaction with another id);
// 3. among the ones that vanished and the new ones of this round, in the same account, 2 of 3 fields
//    of the original (date, amount, description of the bank, normalized): same transaction again.
//    Several: the one that agrees in more fields, then the one of the nearest date.
//
// A match by 2 or 3 moves the link to the new id (`relinked`) and the caller applies the bank's
// version (the edit of Lucas stays). Only then are the ones that still vanished taken as removed,
// and only the ones whose original date is inside the window that was asked (`existing` already comes
// cut by the window, so an old line is not a removal). The ones left over are new.
export function matchBankTransactions(input: {
  incoming: readonly IncomingTransaction[];
  // Pluggy id → transaction of Fincheck, for the ids of `incoming` that have a link.
  linkedByPluggyId: ReadonlyMap<string, string>;
  // The transactions of the account that came from the bank and have a link, inside the window.
  existing: readonly ExistingTransaction[];
}): BankMatchResult {
  const incomingIds = new Set(input.incoming.map((item) => item.key));
  const used = new Set<string>();
  const matched: BankMatch[] = [];
  let pending: IncomingTransaction[] = [];

  for (const item of input.incoming) {
    const transactionId = input.linkedByPluggyId.get(item.key);
    if (transactionId !== undefined && !used.has(transactionId)) {
      matched.push({ key: item.key, transactionId, isRelinked: false });
      used.add(transactionId);
    } else {
      pending.push(item);
    }
  }

  const vanished = input.existing.filter(
    (candidate) => !incomingIds.has(candidate.pluggyId) && !used.has(candidate.transactionId),
  );
  const take = (candidate: ExistingTransaction, item: IncomingTransaction) => {
    matched.push({ key: item.key, transactionId: candidate.transactionId, isRelinked: true });
    used.add(candidate.transactionId);
  };
  const free = () => vanished.filter((candidate) => !used.has(candidate.transactionId));
  // Normalized once: a first round after a reconnection compares thousands of them.
  const normalized = new Map(
    vanished.map((candidate) => [
      candidate.transactionId,
      normalizeText(candidate.bankDescription),
    ]),
  );

  // 2. The id the bank itself gives.
  const afterProviderRef: IncomingTransaction[] = [];
  for (const item of pending) {
    const found =
      item.providerRef === null
        ? undefined
        : free().find((candidate) => candidate.providerRef === item.providerRef);
    if (found) take(found, item);
    else afterProviderRef.push(item);
  }
  pending = afterProviderRef;

  // 3. Two of three fields of the original.
  const stillNew: IncomingTransaction[] = [];
  for (const item of pending.toSorted(
    (a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.key.localeCompare(b.key),
  )) {
    const description = normalizeText(item.description);
    const best = free()
      .map((candidate) => ({
        candidate,
        agreement:
          Number(candidate.bankOccurredOn === item.occurredOn) +
          Number(candidate.bankAmountCents === item.amountCents) +
          Number(normalized.get(candidate.transactionId) === description),
      }))
      .filter((entry) => entry.agreement >= 2)
      .toSorted(
        (a, b) =>
          b.agreement - a.agreement ||
          Math.abs(dayNumber(a.candidate.bankOccurredOn) - dayNumber(item.occurredOn)) -
            Math.abs(dayNumber(b.candidate.bankOccurredOn) - dayNumber(item.occurredOn)) ||
          a.candidate.transactionId.localeCompare(b.candidate.transactionId),
      )[0];
    if (best) take(best.candidate, item);
    else stillNew.push(item);
  }

  return {
    matched,
    created: stillNew,
    removedTransactionIds: free()
      .filter((candidate) => !candidate.isRemovedByBank)
      .map((candidate) => candidate.transactionId),
  };
}

export type IncomingTransaction = {
  // The id of the Pluggy.
  key: string;
  providerRef: string | null;
  description: string;
  amountCents: number;
  occurredOn: string;
};

export type ExistingTransaction = {
  transactionId: string;
  // The id of the Pluggy the link has now.
  pluggyId: string;
  providerRef: string | null;
  bankDescription: string;
  bankAmountCents: number;
  bankOccurredOn: string;
  isRemovedByBank: boolean;
};

export type BankMatch = {
  // The id of the Pluggy of the incoming transaction.
  key: string;
  transactionId: string;
  // The link goes from the old id of the Pluggy to this one.
  isRelinked: boolean;
};

export type BankMatchResult = {
  matched: BankMatch[];
  created: IncomingTransaction[];
  // Newly removed: the ones the bank removed before are not here again.
  removedTransactionIds: string[];
};
