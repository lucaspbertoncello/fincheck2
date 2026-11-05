import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import { buildSubscriptionName } from '#mocks/recurrences/subscription/build-subscription-name.util.ts';
import { listSubscriptionSuggestions } from '#mocks/recurrences/subscription/list-subscription-suggestions.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { CURRENT_MONTH, NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// Creates the recurrence a suggestion proposes (BR-REC-017): an expense on the card, fixed on the
// day of the last charge, worth the last amount, matching the description. The charges it saw are
// linked to the occurrences of their months.
export function acceptSubscriptionSuggestion(
  database: MockState.Database,
  request: Subscription.AcceptRequest,
): Recurrence.CreateResponse {
  const candidate = listSubscriptionSuggestions(database).find(
    (item) => item.suggestion.key === request.key,
  );
  if (!candidate) fail(404, 'SUBSCRIPTION_SUGGESTION_NOT_FOUND', 'Essa sugestão não existe mais');

  const { suggestion, charges } = candidate;
  const [first] = charges;
  const last = charges.at(-1);
  if (!first || !last)
    fail(404, 'SUBSCRIPTION_SUGGESTION_NOT_FOUND', 'Essa sugestão não existe mais');

  const categoryId = request.categoryId ?? last.categoryId;
  if (categoryId && findCategory(database, categoryId).kind !== 'expense')
    fail(422, 'RECURRENCE_CATEGORY_KIND_MISMATCH', 'Categoria de outro tipo');

  const record: MockState.RecurrenceRecord = {
    id: newId(),
    kind: 'expense',
    name: request.name ?? buildSubscriptionName(suggestion.description),
    expectedAmountCents: suggestion.lastAmountCents,
    amountMode: 'fixed',
    counterparty: request.counterparty ?? null,
    matchText: normalizeText(request.matchText ?? suggestion.description),
    employmentRegime: null,
    accountId: suggestion.accountId,
    method: 'credit',
    categoryId: categoryId ?? null,
    dateRule: {
      type: 'fixed_day',
      day: dayOf(suggestion.lastChargedOn),
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: 'none',
    },
    maxPayments: 1,
    startsMonth: first.occurredOn.slice(0, 7),
    pausedAt: null,
    archivedAt: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  database.recurrences.push(record);
  ensureOccurrences(database);

  for (const tx of charges) {
    const month = tx.occurredOn.slice(0, 7);
    let target = database.occurrences.find(
      (item) => item.recurrenceId === record.id && item.month === month,
    );
    if (!target && month < CURRENT_MONTH) {
      target = {
        id: newId(),
        recurrenceId: record.id,
        month,
        ...computeOccurrenceWindow(record.dateRule, month),
        expectedAmountCents: record.expectedAmountCents,
        settledAt: null,
        skippedAt: null,
        decision: null,
        payments: [],
      };
      database.occurrences.push(target);
    }
    if (!target) continue;
    target.payments.push({
      id: newId(),
      transactionId: tx.id,
      amountCents: Math.abs(tx.amountCents),
      occurredOn: tx.occurredOn,
      linkedBy: 'auto',
    });
    if (tx.categoryId === null && record.categoryId) {
      tx.categoryId = record.categoryId;
      tx.categorySource = 'recurrence';
    }
  }

  const current = database.occurrences.find(
    (item) => item.recurrenceId === record.id && item.month === CURRENT_MONTH,
  );

  return { recurrence: record, occurrence: current ? presentOccurrence(database, current) : null };
}
