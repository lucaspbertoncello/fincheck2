import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useApplyRule } from '#/domain/categories/rule/hooks/use-apply-rule.hook.ts';
import { ruleQueries } from '#/domain/categories/rule/queries/rule.query.ts';
import type { RuleFormOutcome } from '#/features/rules/types/rule-form.type.ts';
import { buildRulePreviewBody } from '#/features/rules/rule-list/utils/build-rule-preview-body.util.ts';
import { describeNothingToApply } from '#/features/rules/rule-list/utils/describe-nothing-to-apply.util.ts';
import { buildHistoryChanges } from '#/features/rules/utils/build-history-changes.util.ts';
import { describeRuleError } from '#/features/rules/utils/describe-rule-error.util.ts';

type Options = {
  categories: readonly Category.Dto[];
  tags: readonly Tag.Dto[];
  /** Shows the "N transações foram para X" toast with its undo. */
  announce: (outcome: RuleFormOutcome) => void;
};

type Pending = { rule: Rule.Dto; preview: Rule.Preview };

/**
 * "Aplicar nas transações existentes" on a rule of the list: asks the preview first, opens the
 * confirmation when something would change (and says why in one line when nothing would), applies
 * and hands the result to the undo toast.
 */
export function useApplyExisting({ categories, tags, announce }: Options) {
  const queryClient = useQueryClient();
  const apply = useApplyRule();
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string | null) =>
    categories.find((item) => item.id === id)?.name ?? 'Sem categoria';

  async function begin(rule: Rule.Dto) {
    setNotice(null);
    setError(null);
    if (!rule.enabled) {
      setNotice('A regra está desligada. Ligue-a para aplicar nas transações existentes.');
      return;
    }
    try {
      const preview = await queryClient.fetchQuery({
        ...ruleQueries.preview(buildRulePreviewBody(rule)),
        staleTime: 0,
      });
      if (preview.willChangeCount === 0) setNotice(describeNothingToApply(preview));
      else setPending({ rule, preview });
    } catch {
      setError('Não deu para conferir o histórico agora. Tente de novo.');
    }
  }

  async function confirm() {
    if (!pending) return;
    const { rule } = pending;
    try {
      const applied = await apply.mutateAsync(rule.id);
      // "foram para X" only when some transaction really changed category; else it gained tags.
      const categoryMoved = applied.previous.some((item) => item.categoryId !== rule.categoryId);
      const categoryName = rule.categoryId && categoryMoved ? nameOf(rule.categoryId) : null;
      setPending(null);
      announce({ rule, applied, created: false, categoryName });
    } catch (failure) {
      setPending(null);
      setError(describeRuleError(failure));
    }
  }

  const count = pending?.preview.willChangeCount ?? 0;
  const categoryName = pending?.rule.categoryId ? nameOf(pending.rule.categoryId) : null;
  const tagNames = (pending?.rule.tagIds ?? []).map(
    (id) => tags.find((tag) => tag.id === id)?.name ?? 'tag',
  );

  return {
    begin: (rule: Rule.Dto) => void begin(rule),
    notice,
    dismissNotice: () => setNotice(null),
    error,
    dismissError: () => setError(null),
    dialog: pending
      ? {
          title: 'Aplicar a regra nas transações existentes?',
          description: `Muda ${count} ${count === 1 ? 'transação' : 'transações'}. Dá para desfazer logo depois, pelo aviso na base da tela.`,
          changes: buildHistoryChanges({
            willChangeCount: count,
            examples: pending.preview.examples,
            categoryName,
            tagNames,
            nameOf,
          }),
          confirmLabel: `Aplicar em ${count}`,
          isSaving: apply.isPending,
          onConfirm: () => void confirm(),
          onCancel: () => setPending(null),
        }
      : null,
  };
}
