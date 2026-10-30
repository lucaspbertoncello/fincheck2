import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useApplyRule } from '#/domain/categories/rule/hooks/use-apply-rule.hook.ts';
import { useCreateRule } from '#/domain/categories/rule/hooks/use-create-rule.hook.ts';
import { usePreviewRule } from '#/domain/categories/rule/hooks/use-preview-rule.hook.ts';
import { useUpdateRule } from '#/domain/categories/rule/hooks/use-update-rule.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';

// The preview query needs a body even while it is idle; it never runs with this one.
const IDLE_PREVIEW_BODY: Rule.PreviewRequest = { descriptionContains: '' };

/**
 * What the rule modal reads and writes: the accounts, categories and tags to pick from (the same lists the
 * screen already has in cache), the live preview of what the rule matches, and the three writes.
 */
export function useRuleFormModel(previewBody: Rule.PreviewRequest | null) {
  return {
    accounts: useAccounts({ includeArchived: true }),
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    preview: usePreviewRule(previewBody ?? IDLE_PREVIEW_BODY, { enabled: previewBody !== null }),
    create: useCreateRule(),
    update: useUpdateRule(),
    apply: useApplyRule(),
  };
}
