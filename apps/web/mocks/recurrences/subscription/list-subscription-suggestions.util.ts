import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { SUBSCRIPTION_SUGGESTION_LIMITS } from '@fincheck/shared/recurrences/subscription/subscription.constant.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { buildSubscriptionKey } from '#mocks/recurrences/subscription/build-subscription-key.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

export interface SuggestionCandidate {
  suggestion: Subscription.Suggestion;
  // The charges behind it, oldest first.
  charges: MockState.TransactionRecord[];
}

// A recurrence on the same card already answers for the description (an ended one too). A deleted
// one does not: undoing the acceptance of a suggestion brings it back.
function isCovered(database: MockState.Database, accountId: string, description: string): boolean {
  return database.recurrences.some(
    (recurrence) =>
      !recurrence.archivedAt &&
      recurrence.kind === 'expense' &&
      recurrence.accountId === accountId &&
      description.includes(recurrence.matchText ?? normalizeText(recurrence.name)),
  );
}

// BR-REC-017: the same normalized description on a card, one charge a month, in 2 months in a row,
// each within 15% of the amount after it and within 5 days of its day, and no recurrence on the
// card that already covers it. The last charge is in this month or the one before.
export function listSubscriptionSuggestions(database: MockState.Database): SuggestionCandidate[] {
  const { amountTolerance, dayTolerance, minMonths } = SUBSCRIPTION_SUGGESTION_LIMITS;
  const linkedToLiveRecurrence = new Set(
    database.occurrences
      .filter((occurrence) => {
        const owner = database.recurrences.find((item) => item.id === occurrence.recurrenceId);

        return owner !== undefined && !owner.archivedAt;
      })
      .flatMap((occurrence) => occurrence.payments.map((payment) => payment.transactionId)),
  );
  const cardIds = new Set(
    database.accounts.filter((account) => account.type === 'credit_card').map((item) => item.id),
  );

  const groups = new Map<string, MockState.TransactionRecord[]>();
  for (const tx of database.transactions) {
    if (
      !cardIds.has(tx.accountId) ||
      tx.method !== 'credit' ||
      tx.amountCents >= 0 ||
      tx.installment ||
      !countsInAccounts(tx) ||
      linkedToLiveRecurrence.has(tx.id)
    )
      continue;
    const key = buildSubscriptionKey(tx.description, tx.accountId);
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const result: SuggestionCandidate[] = [];
  const oldestMonth = addMonths(CURRENT_MONTH, -1);

  for (const [key, group] of groups) {
    if (database.subscriptionDismissals.includes(key)) continue;
    const byMonth = new Map<string, MockState.TransactionRecord[]>();
    for (const tx of group) {
      const month = tx.occurredOn.slice(0, 7);
      byMonth.set(month, [...(byMonth.get(month) ?? []), tx]);
    }

    // Walks back from the latest month while the charges keep to the limits.
    const latest = [...byMonth.keys()].sort().at(-1);
    if (!latest || latest < oldestMonth || latest > CURRENT_MONTH) continue;
    const run: MockState.TransactionRecord[] = [];
    for (let month = latest; ; month = addMonths(month, -1)) {
      const charges = byMonth.get(month);
      const [charge] = charges ?? [];
      if (!charges || charges.length !== 1 || !charge) break;
      const newer = run.at(-1);
      if (
        newer &&
        (Math.abs(newer.amountCents - charge.amountCents) >
          Math.abs(newer.amountCents) * amountTolerance ||
          Math.abs(dayOf(newer.occurredOn) - dayOf(charge.occurredOn)) > dayTolerance)
      )
        break;
      run.push(charge);
    }
    if (run.length < minMonths) continue;

    const [last] = run;
    if (!last || isCovered(database, last.accountId, normalizeText(last.description))) continue;
    const charges = [...run].reverse();
    result.push({
      suggestion: {
        key,
        description: last.description,
        accountId: last.accountId,
        lastAmountCents: Math.abs(last.amountCents),
        lastChargedOn: last.occurredOn,
        monthsSeen: run.length,
        transactionIds: charges.map((tx) => tx.id),
      },
      charges,
    });
  }

  return result.sort(
    (a, b) =>
      b.suggestion.lastChargedOn.localeCompare(a.suggestion.lastChargedOn) ||
      a.suggestion.key.localeCompare(b.suggestion.key),
  );
}
