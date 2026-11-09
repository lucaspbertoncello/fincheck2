import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

/** The amount the day list of the strip shows: what came in when it is partial or confirmed, otherwise the expected one. */
export function getOccurrenceAgendaAmount(occurrence: Occurrence.Dto): number {
  const came =
    occurrence.status === 'partial' ||
    (occurrence.status === 'confirmed' && occurrence.receivedCents > 0);

  return came ? occurrence.receivedCents : occurrence.expectedAmountCents;
}
