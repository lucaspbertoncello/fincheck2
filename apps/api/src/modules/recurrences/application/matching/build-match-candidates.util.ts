import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { MatchCandidate } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';

// The occurrences that may still be paid (`expected`, `partial` or `late`) as the candidates of
// `matchTransactionToOccurrences`: the same list for the review queue and for the automatic match
// of the import, so both answer the same way.
export function buildMatchCandidates(views: OccurrenceDtoBuilder.View[]): MatchCandidate[] {
  return views.flatMap((view) =>
    view.state.status === 'expected' ||
    view.state.status === 'partial' ||
    view.state.status === 'late'
      ? [
          {
            occurrenceId: view.occurrence.id,
            recurrenceId: view.recurrence.id,
            kind: view.recurrence.kind,
            month: view.occurrence.month.value,
            windowStartOn: view.occurrence.windowStartOn.value,
            windowEndOn: view.occurrence.windowEndOn.value,
            status: view.state.status,
            paymentCount: view.counted.length,
            expectedCents: view.occurrence.expectedAmount.cents,
            remainingCents: view.state.remainingCents,
            maxPayments: view.recurrence.maxPayments,
            matchText: view.recurrence.matchText,
          },
        ]
      : [],
  );
}
