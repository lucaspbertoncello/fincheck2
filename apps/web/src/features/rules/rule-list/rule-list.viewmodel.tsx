import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import { useToast, type RuleAction } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useScreenSearch } from '#/features/categories/hooks/use-screen-search.hook.ts';
import { useDeferredDeletion } from '#/features/rules/hooks/use-deferred-deletion.hook.ts';
import { useRuleOutcomeToasts } from '#/features/rules/hooks/use-rule-outcome-toasts.hook.ts';
import type { RuleFormTarget } from '#/features/rules/rule-form/types/rule-form.type.ts';
import { useRuleListModel } from '#/features/rules/rule-list/rule-list.model.ts';
import { ruleListSearchSchema } from '#/features/rules/rule-list/schemas/rule-list-search.schema.ts';
import { buildRecreateBody } from '#/features/rules/rule-list/utils/build-recreate-body.util.ts';
import { toRuleRow } from '#/features/rules/rule-list/utils/to-rule-row.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';

// How long "Desfazer" stays on screen, and how long the delete waits for it.
const UNDO_WINDOW_MS = 6000;

/**
 * Wires the Regras screen: the modal lives in the URL (`?new=rule`, `?edit=<id>`), the switch shows
 * its new state at once while it saves, and "Excluir" hides the rule with an undo toast before the
 * delete goes out.
 */
export function useRuleListViewModel() {
  const model = useRuleListModel();
  const toast = useToast();
  const router = useRouter();
  const { search, update } = useScreenSearch(ruleListSearchSchema);
  const outcome = useRuleOutcomeToasts();
  const deletion = useDeferredDeletion(UNDO_WINDOW_MS);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const rules = model.rules.data?.items ?? [];
  const categories = model.categories.data?.items ?? [];
  const tags = model.tags.data?.items ?? [];
  const visibleRules = rules.filter((rule) => !deletion.pendingIds.includes(rule.id));

  const editing = search.edit ? rules.find((rule) => rule.id === search.edit) : undefined;
  const ruleTarget: RuleFormTarget | null = search.new
    ? { mode: 'create' }
    : editing
      ? { mode: 'edit', rule: editing }
      : null;

  function changeActive(id: string, enabled: boolean) {
    setActionError(null);
    setOverrides((current) => ({ ...current, [id]: enabled }));
    model.updateRule
      .mutateAsync({ id, body: { enabled } })
      .catch(() => setActionError('Não deu para ligar ou desligar a regra. Tente de novo.'))
      .finally(() =>
        setOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        }),
      );
  }

  // Too late to cancel (the delete already went out): the undo creates the rule again.
  function recreate(rule: Rule.Dto) {
    model.createRule
      .mutateAsync(buildRecreateBody(rule))
      .then(({ rule: created }) =>
        rule.enabled
          ? undefined
          : model.updateRule.mutateAsync({ id: created.id, body: { enabled: false } }),
      )
      .catch(() => setActionError('Não deu para desfazer. Tente de novo.'));
  }

  function remove(rule: Rule.Dto) {
    setActionError(null);
    deletion.schedule(
      rule.id,
      () => model.deleteRule.mutateAsync(rule.id),
      () => setActionError('Não deu para excluir a regra. Tente de novo.'),
    );
    toast.showUndoToast({
      message: 'Regra excluída.',
      timeout: UNDO_WINDOW_MS,
      onUndo: () => {
        if (!deletion.cancel(rule.id)) recreate(rule);
      },
    });
  }

  function handleAction(id: string, action: RuleAction) {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;

    if (action === 'edit') update({ edit: id, new: undefined });
    else if (action === 'view-transactions') navigateToHref(router, `/transactions?ruleId=${id}`);
    else remove(rule);
  }

  return {
    isLoading: model.rules.isPending || model.categories.isPending || model.tags.isPending,
    isError: model.rules.isError || model.categories.isError || model.tags.isError,
    onRetry: () => {
      void model.rules.refetch();
      void model.categories.refetch();
      void model.tags.refetch();
    },
    actionError: actionError ?? outcome.undoError,
    onDismissActionError: () => {
      setActionError(null);
      outcome.clearUndoError();
    },

    rows: visibleRules.map((rule) =>
      toRuleRow(rule, categories, tags, overrides[rule.id] ?? rule.enabled),
    ),
    onActiveChange: changeActive,
    onAction: handleAction,
    onCreateRule: () => update({ new: 'rule', edit: undefined }),

    ruleForm: {
      target: ruleTarget,
      onClose: () => update({ new: undefined, edit: undefined }),
      onSaved: outcome.announce,
    },
  };
}
