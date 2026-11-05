import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useDeleteRecurrence } from '#/domain/recurrences/recurrence/hooks/use-delete-recurrence.hook.ts';
import { usePauseRecurrence } from '#/domain/recurrences/recurrence/hooks/use-pause-recurrence.hook.ts';
import { useResumeRecurrence } from '#/domain/recurrences/recurrence/hooks/use-resume-recurrence.hook.ts';
import { useUpdateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-update-recurrence.hook.ts';
import { useAcceptSubscriptionSuggestion } from '#/domain/recurrences/subscription/hooks/use-accept-subscription-suggestion.hook.ts';
import { useDismissSubscriptionSuggestion } from '#/domain/recurrences/subscription/hooks/use-dismiss-subscription-suggestion.hook.ts';
import { useSubscriptions } from '#/domain/recurrences/subscription/hooks/use-subscriptions.hook.ts';

/** Everything the Assinaturas tab reads and changes, from the domain hooks. */
export function useSubscriptionListModel(month: string) {
  return {
    subscriptions: useSubscriptions(month),
    categories: useCategories({ status: 'all' }),
    accounts: useAccounts(),
    accept: useAcceptSubscriptionSuggestion(),
    dismiss: useDismissSubscriptionSuggestion(),
    update: useUpdateRecurrence(),
    pause: usePauseRecurrence(),
    resume: useResumeRecurrence(),
    remove: useDeleteRecurrence(),
  };
}
