import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';

import { useCreateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-create-recurrence.hook.ts';
import { useDeleteRecurrence } from '#/domain/recurrences/recurrence/hooks/use-delete-recurrence.hook.ts';
import { usePauseRecurrence } from '#/domain/recurrences/recurrence/hooks/use-pause-recurrence.hook.ts';
import { usePreviewRecurrence } from '#/domain/recurrences/recurrence/hooks/use-preview-recurrence.hook.ts';
import { useRecurrence } from '#/domain/recurrences/recurrence/hooks/use-recurrence.hook.ts';
import { useResumeRecurrence } from '#/domain/recurrences/recurrence/hooks/use-resume-recurrence.hook.ts';
import { useUpdateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-update-recurrence.hook.ts';

/** The recurrence being edited (none when creating). */
export function useRecurrenceFormSource(editId: string | undefined) {
  return useRecurrence(editId ?? '', { enabled: editId !== undefined });
}

/** The changes the form can make. */
export function useRecurrenceFormActions() {
  return {
    create: useCreateRecurrence(),
    update: useUpdateRecurrence(),
    pause: usePauseRecurrence(),
    resume: useResumeRecurrence(),
    remove: useDeleteRecurrence(),
  };
}

/** The next dates of the rule being typed; asks only when the rule is complete. */
export function useRecurrenceRulePreview(dateRule: Recurrence.DateRule, enabled: boolean) {
  return usePreviewRecurrence({ dateRule }, { enabled });
}

/** The active categories of the type being typed (income or expense). */
export function useRecurrenceFormCategories(kind: Recurrence.Kind) {
  return useCategories({ kind, status: 'active' });
}

/** The accounts a recurrence can fall into. */
export function useRecurrenceFormAccounts() {
  return useAccounts();
}
