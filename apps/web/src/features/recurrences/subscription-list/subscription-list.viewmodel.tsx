import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import type { SubscriptionRowAction } from '#/features/recurrences/subscription-list/components/subscription-row.component.tsx';
import { useKeptItems } from '#/features/recurrences/subscription-list/hooks/use-kept-items.hook.ts';
import { useSubscriptionListSearch } from '#/features/recurrences/subscription-list/hooks/use-subscription-list-search.hook.ts';
import { useSubscriptionListModel } from '#/features/recurrences/subscription-list/subscription-list.model.ts';
import { SubscriptionListView } from '#/features/recurrences/subscription-list/subscription-list.view.tsx';
import type {
  ActionErrorData,
  SubscriptionRowData,
  SubscriptionSuggestionData,
} from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';
import { formatMoneyText } from '#/features/recurrences/subscription-list/utils/format-money-text.util.ts';
import { getTodayKey } from '#/features/recurrences/subscription-list/utils/get-today-key.util.ts';
import { presentSubscriptionRow } from '#/features/recurrences/subscription-list/utils/present-subscription-row.util.ts';
import { presentSubscriptionSuggestion } from '#/features/recurrences/subscription-list/utils/present-subscription-suggestion.util.ts';
import { isApiError } from '#/shared/api/api.error.ts';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

type DeleteTarget = { recurrenceId: string; name: string };

function describeFailure(error: unknown): string {
  return isApiError(error) ? error.message : 'Tente de novo em instantes.';
}

/** Connects the Assinaturas tab: month and URL state, the data of the month and the actions. */
export function SubscriptionListViewModel() {
  const { month } = useSelectedMonth();
  const { isHidden } = useHideValues();
  const { showUndoToast } = useToast();
  const search = useSubscriptionListSearch();
  const model = useSubscriptionListModel(month);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ActionErrorData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  // Suggestions answered and waiting to leave (or to be undone): folded, still in the data.
  const [answeredKeys, setAnsweredKeys] = useState<ReadonlySet<string>>(new Set());

  const data = model.subscriptions.data;
  const ready = data !== undefined;
  const keptItems = useKeptItems(data?.items ?? [], (item) => item.recurrence.id, ready);
  const keptSuggestions = useKeptItems(data?.suggestions ?? [], (item) => item.key, ready);

  function setAnswered(key: string, answered: boolean) {
    setAnsweredKeys((current) => {
      const next = new Set(current);
      if (answered) next.add(key);
      else next.delete(key);

      return next;
    });
  }

  async function run(key: string, failure: string, task: () => Promise<void>) {
    setPendingKey(key);
    setActionError(null);
    try {
      await task();
    } catch (error) {
      setActionError({
        message: `${failure} ${describeFailure(error)}`,
        onRetry: () => void run(key, failure, task),
      });
    } finally {
      setPendingKey(null);
    }
  }

  function handleAccept(suggestion: SubscriptionSuggestionData) {
    setAnswered(suggestion.key, true);
    void run(suggestion.key, `Não deu para acompanhar ${suggestion.name}.`, async () => {
      try {
        const { recurrence } = await model.accept.mutateAsync({ key: suggestion.key });
        showUndoToast({
          message: `${suggestion.name} agora é acompanhada.`,
          onUndo: () =>
            void run(recurrence.id, 'Não deu para desfazer.', async () => {
              await model.remove.mutateAsync(recurrence.id);
              setAnswered(suggestion.key, false);
            }),
        });
      } catch (error) {
        setAnswered(suggestion.key, false);
        throw error;
      }
    });
  }

  // The contract has no way to undo a dismissal, so the call waits for the toast to close: while it
  // is open the suggestion is only folded, and "Desfazer" just opens it again.
  function handleDismiss(suggestion: SubscriptionSuggestionData) {
    let undone = false;
    setAnswered(suggestion.key, true);
    showUndoToast({
      message: `${suggestion.name} dispensada. Não vamos sugerir de novo.`,
      onUndo: () => {
        undone = true;
        setAnswered(suggestion.key, false);
      },
      // The close slot of the toast runs before its action when "Desfazer" is pressed: look at
      // `undone` only after the press is over.
      onClose: () =>
        setTimeout(() => {
          if (undone) return;
          void run(suggestion.key, `Não deu para dispensar ${suggestion.name}.`, async () => {
            try {
              await model.dismiss.mutateAsync({ key: suggestion.key });
            } catch (error) {
              setAnswered(suggestion.key, false);
              throw error;
            }
          });
        }, 0),
    });
  }

  function endSubscription(recurrenceId: string, name: string) {
    void run(recurrenceId, `Não deu para encerrar ${name}.`, async () => {
      await model.pause.mutateAsync(recurrenceId);
      showUndoToast({
        message: `${name} encerrada. Sai do Livre e das projeções.`,
        onUndo: () =>
          void run(recurrenceId, `Não deu para retomar ${name}.`, async () => {
            await model.resume.mutateAsync(recurrenceId);
          }),
      });
    });
  }

  function updateValue(recurrenceId: string, name: string) {
    const item = data?.items.find((candidate) => candidate.recurrence.id === recurrenceId);
    const alert = item?.alert;
    if (alert?.kind !== 'price_changed') return;
    const { fromCents, toCents } = alert;
    void run(recurrenceId, `Não deu para atualizar o valor de ${name}.`, async () => {
      await model.update.mutateAsync({ id: recurrenceId, body: { expectedAmountCents: toCents } });
      showUndoToast({
        message: `${name} agora é ${formatMoneyText(toCents, isHidden)}.`,
        onUndo: () =>
          void run(recurrenceId, `Não deu para desfazer.`, async () => {
            await model.update.mutateAsync({
              id: recurrenceId,
              body: { expectedAmountCents: fromCents },
            });
          }),
      });
    });
  }

  function handleRowAction(row: SubscriptionRowData, action: SubscriptionRowAction) {
    switch (action) {
      case 'open':
      case 'edit':
        search.openEdit(row.recurrenceId);
        return;
      case 'update-value':
        updateValue(row.recurrenceId, row.name);
        return;
      case 'end':
        endSubscription(row.recurrenceId, row.name);
        return;
      case 'delete':
        setDeleteTarget({ recurrenceId: row.recurrenceId, name: row.name });
        return;
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { recurrenceId, name } = deleteTarget;
    void run(recurrenceId, `Não deu para excluir ${name}.`, async () => {
      await model.remove.mutateAsync(recurrenceId);
    }).then(() => setDeleteTarget(null));
  }

  const queryFailed = model.subscriptions.isError;
  const state = queryFailed
    ? 'error'
    : !ready
      ? 'loading'
      : data.items.length === 0 && data.suggestions.length === 0
        ? 'empty'
        : 'ready';

  const accountNames = new Map(
    (model.accounts.data?.items ?? []).map((account) => [account.id, account.name]),
  );
  const context = {
    accountNames,
    categoryIcons: new Map(
      (model.categories.data?.items ?? []).map((category) => [category.id, category.icon]),
    ),
    today: getTodayKey(),
    hidden: isHidden,
    pendingKey,
  };

  const rows = keptItems.map(({ item, present, isNew }) => ({
    row: presentSubscriptionRow(item, context),
    present,
    isNew,
  }));
  const suggestions = keptSuggestions.map(({ item, present, isNew }) => ({
    suggestion: presentSubscriptionSuggestion(item, accountNames, isHidden),
    present: present && !answeredKeys.has(item.key),
    isNew,
  }));
  const summary = data?.summary;

  return (
    <SubscriptionListView
      state={state}
      onRetry={() => void model.subscriptions.refetch()}
      onCreate={search.openNew}
      actionError={actionError}
      summary={{
        monthlyTotalCents: summary?.monthlyTotalCents ?? 0,
        yearlyTotalCents: summary?.yearlyTotalCents ?? 0,
        activeCount: summary?.activeCount ?? 0,
      }}
      suggestions={suggestions}
      activeRows={rows.filter((entry) => !entry.row.ended)}
      endedRows={rows.filter((entry) => entry.row.ended)}
      onRowAction={handleRowAction}
      onAcceptSuggestion={handleAccept}
      onDismissSuggestion={handleDismiss}
      deleteTarget={deleteTarget}
      deleting={model.remove.isPending}
      onConfirmDelete={handleConfirmDelete}
      onCancelDelete={() => setDeleteTarget(null)}
    />
  );
}
