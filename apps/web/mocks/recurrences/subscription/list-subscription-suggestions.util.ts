import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { SUBSCRIPTION_SUGGESTION_LIMITS } from '@fincheck/shared/recurrences/subscription/subscription.constant.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { isExcludedFromSuggestions } from '@fincheck/shared/recurrences/subscription-service/is-excluded-from-suggestions.util.ts';

import { buildSubscriptionKey } from '#mocks/recurrences/subscription/build-subscription-key.util.ts';
import { containsAsWords } from '#mocks/recurrences/subscription/contains-as-words.util.ts';
import { parseSubscriptionKey } from '#mocks/recurrences/subscription/parse-subscription-key.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

export interface SuggestionCandidate {
  suggestion: Subscription.Suggestion;
  // The charges behind it, oldest first.
  charges: MockState.TransactionRecord[];
}

// How many months back the purchases are read: enough for a run of charges to show, and no more
// (`monthsSeen` is counted inside this window, so it goes up to 13 with the current month).
const MONTHS_LOOKED_BACK = 12;

// How many days apart two charges are on the "day of the month" circle: a card that charges on the
// 30th one month and on the 2nd the next is 3 days apart, not 28. The older day is read in the
// month of the newer one (held at its end if that month is shorter).
function computeDayDistance(newer: string, older: string): number {
  const length = daysInMonth(newer.slice(0, 7));
  const olderDay = Math.min(dayOf(older), length);
  const gap = Math.abs(dayOf(newer) - olderDay);

  return Math.min(gap, length - gap);
}

// A recurrence on the same card already answers for the description (an ended one too). A deleted
// one does not: undoing the acceptance of a suggestion brings it back. The text is the normalized
// description of the key, and the recurrence matches it as a whole word.
function isCovered(database: MockState.Database, accountId: string, normalized: string): boolean {
  return database.recurrences.some(
    (recurrence) =>
      !recurrence.archivedAt &&
      recurrence.kind === 'expense' &&
      recurrence.accountId === accountId &&
      containsAsWords(normalized, recurrence.matchText ?? normalizeText(recurrence.name)),
  );
}

// BR-REC-017: the same normalized description (no installment "n/N") on a card, one charge a month,
// in 2 months in a row, each within 15% of the amount after it and within 5 days of its day (on the
// circle of the month), and no recurrence on the card that already covers it, and not on the
// exclusion list (delivery, restaurant, groceries, ride apps, fuel). Only an expense counts as a
// purchase (what was lent or moved is not a subscription), read from 12 months back to today. The
// last charge is in this month or the one before.
export function listSubscriptionSuggestions(database: MockState.Database): SuggestionCandidate[] {
  const { amountTolerance, dayTolerance, minMonths } = SUBSCRIPTION_SUGGESTION_LIMITS;
  const tolerancePercent = Math.round(amountTolerance * 100);
  const readFrom = `${addMonths(CURRENT_MONTH, -MONTHS_LOOKED_BACK)}-01`;
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
      tx.nature !== 'expense' ||
      tx.amountCents >= 0 ||
      tx.installment ||
      tx.occurredOn < readFrom ||
      tx.occurredOn > TODAY ||
      !countsInAccounts(tx) ||
      isExcludedFromSuggestions(tx.description) ||
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
        (Math.abs(newer.amountCents - charge.amountCents) * 100 >
          Math.abs(newer.amountCents) * tolerancePercent ||
          computeDayDistance(newer.occurredOn, charge.occurredOn) > dayTolerance)
      )
        break;
      run.push(charge);
    }
    if (run.length < minMonths) continue;

    const [last] = run;
    const parsed = parseSubscriptionKey(key);
    if (!last || !parsed || isCovered(database, last.accountId, parsed.pattern)) continue;
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
