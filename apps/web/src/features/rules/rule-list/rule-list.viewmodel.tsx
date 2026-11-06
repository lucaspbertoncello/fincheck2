import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import { useToast, type RuleAction } from '@fincheck/ui';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useScreenSearch } from '#/shared/hooks/use-screen-search.hook.ts';
import { useDeferredDeletion } from '#/features/rules/hooks/use-deferred-deletion.hook.ts';
import { useApplyExisting } from '#/features/rules/rule-list/hooks/use-apply-existing.hook.ts';
import { useRuleOutcomeToasts } from '#/features/rules/hooks/use-rule-outcome-toasts.hook.ts';
import type { RuleFormTarget } from '#/features/rules/types/rule-form.type.ts';
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
  const { search, update } = useScreenSearch(ruleListSearchSchema);
  const model = useRuleListModel(search.from);
  const toast = useToast();
  const router = useRouter();
  const outcome = useRuleOutcomeToasts();
  const deletion = useDeferredDeletion(UNDO_WINDOW_MS);

  const applyExisting = useApplyExisting({
    categories: model.categories.data?.items ?? [],
    tags: model.tags.data?.items ?? [],
    announce: outcome.announce,
  });

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const rules = model.rules.data?.items ?? [];
  const categories = model.categories.data?.items ?? [];
  const tags = model.tags.data?.items ?? [];
  const visibleRules = rules.filter((rule) => !deletion.pendingIds.includes(rule.id));

  const editing = search.edit ? rules.find((rule) => rule.id === search.edit) : undefined;
  // "Criar regra" from a Pix: wait for the transaction (the modal starts from its first values),
  // and open the plain modal if it cannot be read.
  const waitingForTransaction = search.from !== undefined && model.fromTransaction.isPending;
  const sender = model.fromTransaction.data?.bank?.counterparty ?? undefined;
  const ruleTarget: RuleFormTarget | null = search.new
    ? waitingForTransaction
      ? null
      : { mode: 'create', ...(sender ? { counterparty: sender } : {}) }
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
    else if (action === 'apply') applyExisting.begin(rule);
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
    actionError: actionError ?? outcome.undoError ?? applyExisting.error,
    onDismissActionError: () => {
      setActionError(null);
      outcome.clearUndoError();
      applyExisting.dismissError();
    },
    applyNotice: applyExisting.notice,
    onDismissApplyNotice: applyExisting.dismissNotice,
    applyDialog: applyExisting.dialog,

    rows: visibleRules.map((rule) =>
      toRuleRow(rule, categories, tags, overrides[rule.id] ?? rule.enabled),
    ),
    onActiveChange: changeActive,
    onAction: handleAction,
    onCreateRule: () => update({ new: 'rule', edit: undefined, from: undefined }),

    ruleForm: {
      target: ruleTarget,
      onClose: () => update({ new: undefined, edit: undefined, from: undefined }),
      onSaved: outcome.announce,
      onDelete: (rule: Rule.Dto) => {
        update({ new: undefined, edit: undefined, from: undefined });
        remove(rule);
      },
    },
  };
}
