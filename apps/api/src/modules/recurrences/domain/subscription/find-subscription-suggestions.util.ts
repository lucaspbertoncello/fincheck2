import { SUBSCRIPTION_SUGGESTION_LIMITS } from '@fincheck/shared/recurrences/subscription/subscription.constant.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { isExcludedFromSuggestions } from '@fincheck/shared/recurrences/subscription-service/is-excluded-from-suggestions.util.ts';

import { buildSubscriptionKey } from '#/modules/recurrences/domain/subscription/build-subscription-key.util.ts';
import { computeDayDistance } from '#/modules/recurrences/domain/subscription/compute-day-distance.util.ts';
import { containsAsWords } from '#/modules/recurrences/domain/subscription/contains-as-words.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Parece uma assinatura" (BR-REC-017). A purchase on a card is a suggestion when the same
// description (normalized) comes back on the same card in 2 months in a row, one charge a month,
// each within 15% of the amount after it and within 5 days of its day, and the last one is in this
// month or the one before. Nothing is suggested when the description is on the exclusion list
// (delivery, restaurant, groceries, ride apps, fuel: Lucas, 06/11/2026), when a recurrence on the
// same card already covers it, when Lucas said "Agora não", or when the purchase is already the
// payment of a live recurrence. Pure: it takes the purchases it may look at.
export function findSubscriptionSuggestions(input: {
  // Purchases on a card, installments out, that enter the accounts. Amounts positive.
  purchases: readonly SuggestionPurchase[];
  today: BusinessDate;
  dismissedKeys: ReadonlySet<string>;
  // Transactions that already settle an occurrence of a recurrence that is not deleted.
  linkedTransactionIds: ReadonlySet<string>;
  // What each recurrence answers for: its account and the normalized text it matches.
  coverage: readonly { accountId: string; pattern: string }[];
}): SubscriptionSuggestionCandidate[] {
  const { amountTolerance, dayTolerance, minMonths } = SUBSCRIPTION_SUGGESTION_LIMITS;
  const tolerancePercent = Math.round(amountTolerance * 100);
  const currentMonth = Month.containing(input.today);
  const oldestMonth = currentMonth.previous().value;

  const groups = new Map<string, SuggestionPurchase[]>();
  for (const purchase of input.purchases) {
    if (
      isExcludedFromSuggestions(purchase.description) ||
      input.linkedTransactionIds.has(purchase.transactionId)
    ) {
      continue;
    }
    const key = buildSubscriptionKey(purchase.description, purchase.accountId);
    groups.set(key, [...(groups.get(key) ?? []), purchase]);
  }

  const found: SubscriptionSuggestionCandidate[] = [];
  for (const [key, group] of groups) {
    if (input.dismissedKeys.has(key)) continue;

    const byMonth = new Map<string, SuggestionPurchase[]>();
    for (const purchase of group) {
      const month = Month.containing(purchase.occurredOn).value;
      byMonth.set(month, [...(byMonth.get(month) ?? []), purchase]);
    }

    // Walks back from the latest month while the charges keep to the limits.
    const latest = [...byMonth.keys()].toSorted().at(-1);
    if (latest === undefined || latest < oldestMonth || latest > currentMonth.value) continue;

    const run: SuggestionPurchase[] = [];
    for (let month = Month.of(latest); ; month = month.previous()) {
      const charges = byMonth.get(month.value);
      const [charge] = charges ?? [];
      if (!charges || charges.length !== 1 || !charge) break;
      const newer = run.at(-1);
      if (
        newer &&
        (Math.abs(newer.amountCents - charge.amountCents) * 100 >
          newer.amountCents * tolerancePercent ||
          computeDayDistance(newer.occurredOn, charge.occurredOn) > dayTolerance)
      ) {
        break;
      }
      run.push(charge);
    }
    if (run.length < minMonths) continue;

    const [last] = run;
    if (!last) continue;
    const normalized = key.slice(0, key.lastIndexOf('|'));
    const covered = input.coverage.some(
      (item) => item.accountId === last.accountId && containsAsWords(normalized, item.pattern),
    );
    if (covered) continue;

    const charges = [...run].reverse();
    found.push({
      suggestion: {
        key,
        description: last.description,
        accountId: last.accountId,
        lastAmountCents: last.amountCents,
        lastChargedOn: last.occurredOn.value,
        monthsSeen: run.length,
        transactionIds: charges.map((charge) => charge.transactionId),
      },
      charges,
    });
  }

  return found.toSorted(
    (a, b) =>
      b.suggestion.lastChargedOn.localeCompare(a.suggestion.lastChargedOn) ||
      a.suggestion.key.localeCompare(b.suggestion.key),
  );
}

export type SuggestionPurchase = {
  transactionId: string;
  accountId: string;
  description: string;
  // Positive.
  amountCents: number;
  occurredOn: BusinessDate;
};

export type SubscriptionSuggestionCandidate = {
  suggestion: Subscription.Suggestion;
  // The charges behind it, oldest first.
  charges: SuggestionPurchase[];
};
