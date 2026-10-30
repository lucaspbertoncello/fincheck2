import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useDecideOccurrenceDifference } from '#/domain/recurrences/occurrence/hooks/use-decide-occurrence-difference.hook.ts';
import { useOccurrences } from '#/domain/recurrences/occurrence/hooks/use-occurrences.hook.ts';
import { useSettleOccurrence } from '#/domain/recurrences/occurrence/hooks/use-settle-occurrence.hook.ts';
import { useSkipOccurrence } from '#/domain/recurrences/occurrence/hooks/use-skip-occurrence.hook.ts';
import { useUnsettleOccurrence } from '#/domain/recurrences/occurrence/hooks/use-unsettle-occurrence.hook.ts';
import { useUnskipOccurrence } from '#/domain/recurrences/occurrence/hooks/use-unskip-occurrence.hook.ts';
import { useDeleteRecurrence } from '#/domain/recurrences/recurrence/hooks/use-delete-recurrence.hook.ts';
import { usePauseRecurrence } from '#/domain/recurrences/recurrence/hooks/use-pause-recurrence.hook.ts';
import { useRecurrenceSummary } from '#/domain/recurrences/recurrence/hooks/use-recurrence-summary.hook.ts';
import { useRecurrences } from '#/domain/recurrences/recurrence/hooks/use-recurrences.hook.ts';
import { useResumeRecurrence } from '#/domain/recurrences/recurrence/hooks/use-resume-recurrence.hook.ts';

/** Everything the Recorrências screen reads and changes, from the domain hooks. */
export function useRecurrenceListModel(month: string) {
  const recurrences = useRecurrences(month);
  const summary = useRecurrenceSummary(month);
  const occurrences = useOccurrences(month);
  const attention = useOccurrences(month, true);
  const categories = useCategories({ status: 'all' });
  const accounts = useAccounts();

  return {
    recurrences,
    summary,
    occurrences,
    attention,
    categories,
    accounts,
    settle: useSettleOccurrence(),
    unsettle: useUnsettleOccurrence(),
    skip: useSkipOccurrence(),
    unskip: useUnskipOccurrence(),
    decideDifference: useDecideOccurrenceDifference(),
    pause: usePauseRecurrence(),
    resume: useResumeRecurrence(),
    remove: useDeleteRecurrence(),
  };
}
