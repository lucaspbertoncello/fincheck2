import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';

import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

type Candidate = ReviewQueue.ItemDto['recurrenceCandidates'][number];

// Within 15% of a target is a match; within R$ 1,00 of one is exact (recurrences, BR-REC-006).
function amountMatch(value: number, targets: number[]): { matches: boolean; exact: boolean } {
  let matches = false;
  let exact = false;
  for (const target of targets) {
    if (target <= 0) continue;
    const gap = Math.abs(value - target);
    if (gap * 100 <= 15 * target) matches = true;
    if (gap <= 100) exact = true;
  }

  return { matches, exact };
}

// The occurrences a transaction of the queue could pay (the allowance and the meal voucher), by the
// rule of the automatic match of the API: same kind, still open, fewer payments than the limit, the
// day inside the window, one per recurrence (the oldest month), the sender in the text when the
// recurrence has one. One that fits is offered even though it was not tied by itself; several that
// fit are all offered, unless one is exact (then only that one); none by value but the sender
// fits, the ones of that sender. A transaction that already pays something gets none.
export function findRecurrenceCandidates(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): Candidate[] {
  if (isTransactionLinked(database, tx.id)) return [];
  const kind = tx.amountCents > 0 ? 'income' : 'expense';
  const amount = Math.abs(tx.amountCents);
  const text = normalizeText(
    `${tx.bank?.counterparty ?? ''} ${tx.bank?.description ?? ''} ${tx.description}`,
  );

  const oldestByRecurrence = new Map<string, Occurrence.Dto>();
  for (const record of database.occurrences) {
    const recurrence = database.recurrences.find((item) => item.id === record.recurrenceId);
    if (!recurrence || recurrence.pausedAt || recurrence.archivedAt) continue;
    const occurrence = presentOccurrence(database, record);
    if (!['expected', 'partial', 'late'].includes(occurrence.status)) continue;
    if (occurrence.kind !== kind) continue;
    // `maxPayments` null is "Quantas vierem": no limit of payments.
    if (recurrence.maxPayments !== null && occurrence.payments.length >= recurrence.maxPayments) {
      continue;
    }
    if (occurrence.windowStartOn > tx.occurredOn) continue;
    if (occurrence.status !== 'late' && tx.occurredOn > occurrence.windowEndOn) continue;
    const kept = oldestByRecurrence.get(occurrence.recurrenceId);
    if (!kept || occurrence.month < kept.month)
      oldestByRecurrence.set(occurrence.recurrenceId, occurrence);
  }

  const fromSender = [...oldestByRecurrence.values()].flatMap((occurrence) => {
    const recurrence = database.recurrences.find((item) => item.id === occurrence.recurrenceId);
    if (!recurrence) return [];
    if (recurrence.matchText !== null && !text.includes(recurrence.matchText)) return [];
    // "Quantas vierem" has no "one part" value: only what is expected and what is left.
    const targets = [occurrence.expectedAmountCents, occurrence.remainingCents];
    if (recurrence.maxPayments !== null) {
      targets.push(Math.ceil(occurrence.expectedAmountCents / recurrence.maxPayments));
    }
    const { matches, exact } = amountMatch(amount, targets);

    // Without a sender only the exact value counts; "Quantas vierem" with one takes any value.
    const anyValue = recurrence.maxPayments === null && recurrence.matchText !== null;

    return [
      {
        occurrence,
        hasSender: recurrence.matchText !== null,
        matches: anyValue || (recurrence.matchText === null ? exact : matches),
        exact,
      },
    ];
  });

  const matched = fromSender.filter((item) => item.matches);
  let offered = matched;
  if (matched.length > 1) {
    // With one exact among them the match links that one: it is the only one offered.
    const exactOnes = matched.filter((item) => item.exact);
    if (exactOnes.length === 1) offered = exactOnes;
  } else if (matched.length === 0) {
    offered = fromSender.filter((item) => item.hasSender);
  }

  return offered
    .map(({ occurrence }) => ({
      occurrenceId: occurrence.id,
      recurrenceId: occurrence.recurrenceId,
      recurrenceName: occurrence.recurrenceName,
      month: occurrence.month,
      expectedAmountCents: occurrence.expectedAmountCents,
      remainingCents: Math.max(1, occurrence.remainingCents),
    }))
    .sort(
      (a, b) =>
        a.month.localeCompare(b.month) ||
        a.recurrenceName.localeCompare(b.recurrenceName, 'pt-BR', { sensitivity: 'base' }),
    );
}
