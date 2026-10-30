import { useOccurrences } from '#/domain/recurrences/occurrence/hooks/use-occurrences.hook.ts';
import { useUpdateOccurrence } from '#/domain/recurrences/occurrence/hooks/use-update-occurrence.hook.ts';

/** The occurrences of the month (to find the one being edited) and the change of its amount. */
export function useExpectedAmountModel(month: string) {
  return { occurrences: useOccurrences(month), update: useUpdateOccurrence() };
}
