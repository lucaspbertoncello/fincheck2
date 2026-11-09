import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { computeAmountMatch } from '#/modules/recurrences/domain/matching/compute-amount-match.util.ts';

// Which occurrence a transaction settles (BR-REC-006, 010, 012). Pure: it takes the transaction and
// the occurrences still open, and answers one of three things.
//
// 1. Candidates: same kind, still `expected`, `partial` or `late`, with fewer payments than
//    `maxPayments` (`null` is "Quantas vierem": no limit), and the day of the transaction in the
//    window (`windowStartOn` to `windowEndOn`; a late occurrence has no end, it takes any day from
//    `windowStartOn`, until it is paid or skipped). The same recurrence with two candidates keeps
//    the oldest month. Once the month is confirmed (the sum reached the expected amount, or one
//    Pix of 85% or more), it is no longer a candidate: a new Pix does not link by itself, only by
//    hand ("Vincular transação").
// 2. Sender: with a `matchText`, it must be inside the text of the transaction; without it, the
//    value has to be exact.
// 3. Value: within 15% of the expected amount, of what is left or of a part (the expected amount
//    divided by `maxPayments`), and exact within R$ 1,00. "Quantas vierem" with a sender that
//    fits takes any positive value (the Pix come in 2 or 4 of different sizes), and has no part.
// 4. Decision: one match links; several matches link only when one is exact; otherwise the
//    transaction goes to review with the candidates. No match by value, but a sender that fits:
//    review with those. Nothing: an ordinary transaction.
export function matchTransactionToOccurrences(input: {
  transaction: {
    occurredOn: string;
    kind: Recurrence.Kind;
    // Positive.
    amountCents: number;
    // Sender, description of the bank and description in use, normalized.
    text: string;
  };
  candidates: readonly MatchCandidate[];
}): MatchDecision {
  const { transaction } = input;

  const inWindow = input.candidates.filter(
    (candidate) =>
      candidate.kind === transaction.kind &&
      (candidate.maxPayments === null || candidate.paymentCount < candidate.maxPayments) &&
      candidate.windowStartOn <= transaction.occurredOn &&
      (candidate.status === 'late' || transaction.occurredOn <= candidate.windowEndOn),
  );

  // One candidate per recurrence: the oldest month.
  const oldestByRecurrence = new Map<string, MatchCandidate>();
  for (const candidate of inWindow) {
    const kept = oldestByRecurrence.get(candidate.recurrenceId);
    if (!kept || candidate.month < kept.month)
      oldestByRecurrence.set(candidate.recurrenceId, candidate);
  }

  const fromSender = [...oldestByRecurrence.values()].filter(
    (candidate) => candidate.matchText === null || transaction.text.includes(candidate.matchText),
  );

  const scored = fromSender.map((candidate) => {
    const wanted = [candidate.expectedCents, candidate.remainingCents];
    if (candidate.maxPayments !== null) {
      wanted.push(Math.ceil(candidate.expectedCents / candidate.maxPayments));
    }
    const { matches, exact } = computeAmountMatch(transaction.amountCents, wanted);
    // Without a sender to filter by, only the exact value counts; "Quantas vierem" with one takes
    // any value (a Pix of the right size is still `exact`, so it wins a tie).
    const anyValue = candidate.maxPayments === null && candidate.matchText !== null;

    return {
      candidate,
      matches: anyValue || (candidate.matchText === null ? exact : matches),
      exact,
    };
  });

  const matched = scored.filter((item) => item.matches);
  const [only] = matched;
  if (only && matched.length === 1)
    return { type: 'link', occurrenceId: only.candidate.occurrenceId };

  if (matched.length > 1) {
    const exactOnes = matched.filter((item) => item.exact);
    const [theOne] = exactOnes;
    if (theOne && exactOnes.length === 1) {
      return { type: 'link', occurrenceId: theOne.candidate.occurrenceId };
    }

    return { type: 'review', occurrenceIds: matched.map((item) => item.candidate.occurrenceId) };
  }

  const bySender = fromSender.filter((candidate) => candidate.matchText !== null);
  if (bySender.length > 0) {
    return { type: 'review', occurrenceIds: bySender.map((candidate) => candidate.occurrenceId) };
  }

  return { type: 'none' };
}

export type MatchCandidate = {
  occurrenceId: string;
  recurrenceId: string;
  kind: Recurrence.Kind;
  // `YYYY-MM`.
  month: string;
  windowStartOn: string;
  windowEndOn: string;
  status: 'expected' | 'partial' | 'late';
  // Payments that count.
  paymentCount: number;
  expectedCents: number;
  remainingCents: number;
  // `null`: as many as come.
  maxPayments: number | null;
  // Normalized, or null.
  matchText: string | null;
};

export type MatchDecision =
  | { type: 'link'; occurrenceId: string }
  | { type: 'review'; occurrenceIds: string[] }
  | { type: 'none' };
