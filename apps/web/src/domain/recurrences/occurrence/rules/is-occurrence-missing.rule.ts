import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

/**
 * An occurrence of the month that still lacks money: the same notion as the "faltam" of the card,
 * which the API sums as `remainingCents` of the month's occurrences with the dismissed ones out
 * (`GetRecurrenceSummaryQuery`; `remainingCents` is already 0 for a confirmed and a dismissed one,
 * and never negative). A late one brought from an earlier month is not in that sum, so it is not
 * here either.
 */
export function isOccurrenceMissing(occurrence: Occurrence.Dto): boolean {
  return (
    !occurrence.carriedOver && occurrence.status !== 'skipped' && occurrence.remainingCents > 0
  );
}
