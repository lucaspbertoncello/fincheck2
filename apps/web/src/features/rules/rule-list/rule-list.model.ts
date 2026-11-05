import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateRule } from '#/domain/categories/rule/hooks/use-create-rule.hook.ts';
import { useDeleteRule } from '#/domain/categories/rule/hooks/use-delete-rule.hook.ts';
import { useRules } from '#/domain/categories/rule/hooks/use-rules.hook.ts';
import { useUpdateRule } from '#/domain/categories/rule/hooks/use-update-rule.hook.ts';
import { useTransaction } from '#/domain/transactions/transaction/hooks/use-transaction.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';

/**
 * What the Regras screen reads and writes: the rules and, to write their sentences, every category
 * and tag (archived ones too). The switch updates a rule, "Excluir" deletes it, and "Desfazer" of a
 * delete that already went through creates it again.
 */
export function useRuleListModel(fromTransactionId: string | undefined) {
  return {
    rules: useRules(),
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    updateRule: useUpdateRule(),
    deleteRule: useDeleteRule(),
    createRule: useCreateRule(),
    fromTransaction: useTransaction(fromTransactionId ?? '', {
      enabled: fromTransactionId !== undefined,
    }),
  };
}
