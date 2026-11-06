import type { RuleSuggestion } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.type.ts';
import { useState } from 'react';

import { useRuleOutcomeToasts } from '#/features/rules/hooks/use-rule-outcome-toasts.hook.ts';
import type { TagOption } from '#/features/rules/types/rule-form.type.ts';
import { buildCategoryGroups } from '#/features/rules/utils/build-category-groups.util.ts';
import { useRuleSuggestionModel } from '#/features/rules/rule-suggestion/rule-suggestion.model.ts';
import { buildHistoryLabel } from '#/features/rules/utils/build-history-label.util.ts';
import { buildHistoryChanges } from '#/features/rules/utils/build-history-changes.util.ts';
import { buildRulePreview } from '#/features/rules/utils/build-rule-preview.util.ts';
import { describeRuleError } from '#/features/rules/utils/describe-rule-error.util.ts';

type Draft = { tagIds: string[]; applyToHistory: boolean };

const EMPTY_DRAFT: Draft = { tagIds: [], applyToHistory: false };

function keyOf(suggestion: RuleSuggestion.Dto): string {
  return `${suggestion.pattern}::${suggestion.categoryId}`;
}

/**
 * Wires the suggestion cards of the Regras screen: each card keeps its own tags and "apply to the
 * history" choice, "Criar regra" accepts it (after the confirmation when the box is checked) and
 * "Agora não" dismisses it for good.
 */
export function useRuleSuggestionViewModel() {
  const model = useRuleSuggestionModel();
  const outcome = useRuleOutcomeToasts();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const suggestions = model.suggestions.data?.items ?? [];
  const categories = model.categories.data?.items ?? [];
  const tagOptions: TagOption[] = (model.tags.data?.items ?? [])
    .filter((tag) => tag.archivedAt === null)
    .map((tag) => ({ id: tag.id, name: tag.name }));

  const nameOf = (id: string | null) =>
    categories.find((item) => item.id === id)?.name ?? 'Sem categoria';

  function draftOf(key: string): Draft {
    return drafts[key] ?? EMPTY_DRAFT;
  }

  function patchDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? EMPTY_DRAFT), ...patch } }));
  }

  async function accept(suggestion: RuleSuggestion.Dto) {
    const key = keyOf(suggestion);
    const draft = draftOf(key);
    setBusyKey(key);
    setErrors((current) => ({ ...current, [key]: '' }));
    try {
      const result = await model.accept.mutateAsync({
        pattern: suggestion.pattern,
        categoryId: suggestion.categoryId,
        ...(draft.tagIds.length > 0 ? { tagIds: draft.tagIds } : {}),
        applyToHistory: draft.applyToHistory,
      });
      outcome.announce({
        rule: result.rule,
        applied: result.applied,
        created: true,
        categoryName: nameOf(suggestion.categoryId),
      });
    } catch (error) {
      setErrors((current) => ({ ...current, [key]: describeRuleError(error) }));
    } finally {
      setBusyKey(null);
      setConfirmingKey(null);
    }
  }

  function create(suggestion: RuleSuggestion.Dto) {
    const key = keyOf(suggestion);
    if (draftOf(key).applyToHistory && suggestion.willChangeCount > 0) {
      setConfirmingKey(key);
      return;
    }
    void accept(suggestion);
  }

  function dismiss(suggestion: RuleSuggestion.Dto) {
    const key = keyOf(suggestion);
    setBusyKey(key);
    model.dismiss
      .mutateAsync({ pattern: suggestion.pattern, categoryId: suggestion.categoryId })
      .catch(() =>
        setErrors((current) => ({ ...current, [key]: 'Não deu para dispensar. Tente de novo.' })),
      )
      .finally(() => setBusyKey(null));
  }

  // One card at a time, the strongest first; answering it brings the next one.
  const cards = suggestions.slice(0, 1).map((suggestion) => {
    const key = keyOf(suggestion);
    const draft = draftOf(key);
    const category = categories.find((item) => item.id === suggestion.categoryId);

    return {
      key,
      intro: `Você moveu ${suggestion.recategorizedCount} transações “${suggestion.pattern}” para ${nameOf(suggestion.categoryId)}. A regra faz isso sozinha daqui para a frente.`,
      pattern: suggestion.pattern,
      categoryId: suggestion.categoryId,
      categoryGroups: buildCategoryGroups(categories, {
        kind: suggestion.kind,
        selectedId: suggestion.categoryId,
      }),
      tagOptions,
      tagIds: draft.tagIds,
      preview: buildRulePreview(suggestion),
      historyOption:
        suggestion.willChangeCount > 0
          ? {
              label: buildHistoryLabel(suggestion.willChangeCount),
              hint: 'Recategoriza o histórico; edições feitas à mão não mudam.',
              checked: draft.applyToHistory,
            }
          : null,
      isBusy: busyKey === key,
      error: errors[key] || null,
      categoryName: category?.name ?? null,
      onTagIdsChange: (tagIds: string[]) => patchDraft(key, { tagIds }),
      onApplyToHistoryChange: (checked: boolean) => patchDraft(key, { applyToHistory: checked }),
      onCreate: () => create(suggestion),
      onDismiss: () => dismiss(suggestion),
    };
  });

  const confirming = suggestions.find((suggestion) => keyOf(suggestion) === confirmingKey);

  return {
    cards,
    waitingCount: Math.max(0, suggestions.length - cards.length),
    confirmDialog: confirming
      ? {
          title: 'Aplicar a regra no histórico?',
          description: 'Dá para desfazer logo depois, pelo aviso na base da tela.',
          changes: buildHistoryChanges({
            willChangeCount: confirming.willChangeCount,
            examples: confirming.examples,
            categoryName: nameOf(confirming.categoryId),
            nameOf,
          }),
          confirmLabel: `Aplicar em ${confirming.willChangeCount}`,
          loading: busyKey === keyOf(confirming),
          onConfirm: () => void accept(confirming),
          onCancel: () => setConfirmingKey(null),
        }
      : null,
  };
}
