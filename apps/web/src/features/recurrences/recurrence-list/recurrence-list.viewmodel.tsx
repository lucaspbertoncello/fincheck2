import type { RecurrenceAction } from '@fincheck/ui';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useRecurrenceListSearch } from '#/features/recurrences/hooks/use-recurrence-list-search.hook.ts';
import { useRecurrenceListModel } from '#/features/recurrences/recurrence-list/recurrence-list.model.ts';
import { RecurrenceListView } from '#/features/recurrences/recurrence-list/recurrence-list.view.tsx';
import type {
  ActionErrorData,
  OccurrenceRowData,
} from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import type { RowContext } from '#/features/recurrences/recurrence-list/types/row-context.type.ts';
import { buildExpenseCaption } from '#/features/recurrences/recurrence-list/utils/build-expense-caption.util.ts';
import { buildIncomeCaption } from '#/features/recurrences/recurrence-list/utils/build-income-caption.util.ts';
import { buildOccurrenceChips } from '#/features/recurrences/recurrence-list/utils/build-occurrence-chips.util.ts';
import { buildOccurrenceDays } from '#/features/recurrences/recurrence-list/utils/build-occurrence-days.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { presentIdleRecurrence } from '#/features/recurrences/recurrence-list/utils/present-idle-recurrence.util.ts';
import { presentOccurrenceRow } from '#/features/recurrences/recurrence-list/utils/present-occurrence-row.util.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

type DeleteTarget = { recurrenceId: string; name: string };

/** Connects the Recorrências screen: month and URL state, the data of the month and the actions. */
export function RecurrenceListViewModel() {
  const { month, monthLabel } = useSelectedMonth();
  const { isHidden } = useHideValues();
  const { showUndoToast } = useToast();
  const search = useRecurrenceListSearch();
  const model = useRecurrenceListModel(month);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ActionErrorData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const today = getBusinessDate();

  async function run(key: string, failure: string, task: () => Promise<void>) {
    setPendingKey(key);
    setActionError(null);
    try {
      await task();
    } catch (error) {
      setActionError({
        message: `${failure} ${getApiErrorMessage(error, 'Tente de novo em instantes.')}`,
        onRetry: () => void run(key, failure, task),
      });
    } finally {
      setPendingKey(null);
    }
  }

  function offerUndo(message: string, key: string, undo: () => Promise<unknown>) {
    showUndoToast({
      message,
      onUndo: () => void run(key, 'Não deu para desfazer.', async () => void (await undo())),
    });
  }

  function handleRowAction(row: OccurrenceRowData, action: RecurrenceAction) {
    const { occurrenceId, recurrenceId, name, flow } = row;
    switch (action) {
      case 'mark-done':
        void run(occurrenceId, `Não deu para marcar ${name}.`, async () => {
          await model.settle.mutateAsync(occurrenceId);
          offerUndo(
            `${name} marcada como ${flow === 'income' ? 'recebida' : 'paga'}.`,
            occurrenceId,
            () => model.unsettle.mutateAsync(occurrenceId),
          );
        });
        return;
      case 'link':
        search.openLink(occurrenceId);
        return;
      case 'edit-expected':
        search.openExpected(occurrenceId);
        return;
      case 'dismiss':
        void run(occurrenceId, `Não deu para dispensar ${name}.`, async () => {
          await model.skip.mutateAsync(occurrenceId);
          offerUndo(`${name} dispensada neste mês.`, occurrenceId, () =>
            model.unskip.mutateAsync(occurrenceId),
          );
        });
        return;
      case 'undismiss':
        void run(occurrenceId, `Não deu para desfazer a dispensa de ${name}.`, async () => {
          await model.unskip.mutateAsync(occurrenceId);
        });
        return;
      case 'edit':
        search.openEdit(recurrenceId);
        return;
      case 'pause':
        void run(recurrenceId, `Não deu para pausar ${name}.`, async () => {
          await model.pause.mutateAsync(recurrenceId);
          offerUndo(`${name} pausada. Saiu do Livre e das projeções.`, recurrenceId, () =>
            model.resume.mutateAsync(recurrenceId),
          );
        });
        return;
      case 'delete':
        setDeleteTarget({ recurrenceId, name });
        return;
    }
  }

  function handleDecideDifference(row: OccurrenceRowData, decision: 'update' | 'keep') {
    void run(row.occurrenceId, `Não deu para registrar a escolha em ${row.name}.`, async () => {
      await model.decideDifference.mutateAsync({ id: row.occurrenceId, body: { decision } });
    });
  }

  function handleResume(recurrenceId: string, name: string) {
    void run(recurrenceId, `Não deu para retomar ${name}.`, async () => {
      await model.resume.mutateAsync(recurrenceId);
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { recurrenceId, name } = deleteTarget;
    void run(recurrenceId, `Não deu para excluir ${name}.`, async () => {
      await model.remove.mutateAsync(recurrenceId);
    }).then(() => setDeleteTarget(null));
  }

  function retryAll() {
    for (const query of [model.recurrences, model.summary, model.occurrences, model.attention]) {
      if (query.isError) void query.refetch();
    }
  }

  const queries = [model.recurrences, model.summary, model.occurrences, model.attention];
  const state = queries.some((query) => query.isError)
    ? 'error'
    : queries.some((query) => query.data === undefined)
      ? 'loading'
      : (model.recurrences.data?.items.length ?? 0) === 0
        ? 'empty'
        : 'ready';

  const recurrenceItems = model.recurrences.data?.items ?? [];
  const context: RowContext = {
    recurrences: new Map(recurrenceItems.map((item) => [item.id, item])),
    categoryIcons: new Map(
      (model.categories.data?.items ?? []).map((category) => [category.id, category.icon]),
    ),
    accountNames: new Map(
      (model.accounts.data?.items ?? []).map((account) => [account.id, account.name]),
    ),
    today,
    hidden: isHidden,
    pendingKey,
  };

  const attentionOccurrences = model.attention.data?.items ?? [];
  const attentionIds = new Set(attentionOccurrences.map((occurrence) => occurrence.id));
  const attentionRows = attentionOccurrences.map((occurrence) =>
    presentOccurrenceRow(occurrence, context),
  );

  const monthRows = recurrenceItems.flatMap((item) =>
    item.occurrence && !attentionIds.has(item.occurrence.id)
      ? [presentOccurrenceRow(item.occurrence, context)]
      : [],
  );
  const idleRecurrences = recurrenceItems
    .filter((item) => item.occurrence === null)
    .map((item) => presentIdleRecurrence(item, context));

  const allOccurrences = model.occurrences.data?.items ?? [];
  const days = buildOccurrenceDays(
    month,
    allOccurrences.map((occurrence) => ({
      occurrence,
      row: presentOccurrenceRow(occurrence, context),
    })),
  );
  const selectedDate =
    search.day && search.day.startsWith(month)
      ? search.day
      : today.startsWith(month)
        ? today
        : `${month}-01`;

  const summary = model.summary.data;
  const monthName = monthLabel.toLowerCase();

  return (
    <RecurrenceListView
      state={state}
      onRetry={retryAll}
      onCreate={search.openNew}
      actionError={actionError}
      attentionRows={attentionRows}
      incomeCard={{
        label: `Receitas esperadas em ${monthName}`,
        totalCents: summary?.incomes.expectedCents ?? 0,
        caption: summary ? buildIncomeCaption(summary, isHidden) : undefined,
      }}
      expenseCard={{
        label: 'Despesas fixas',
        totalCents: summary?.expenses.expectedCents ?? 0,
        caption: summary ? buildExpenseCaption(summary) : undefined,
      }}
      strip={{
        title: `${monthLabel}, dia a dia`,
        days,
        today,
        selectedDate,
        chips: buildOccurrenceChips(month, allOccurrences),
      }}
      incomeRows={monthRows.filter((row) => row.flow === 'income')}
      expenseRows={monthRows.filter((row) => row.flow === 'expense')}
      idleRecurrences={idleRecurrences}
      onSelectDay={search.selectDay}
      onRowAction={handleRowAction}
      onDecideDifference={handleDecideDifference}
      onResume={handleResume}
      onEditRecurrence={search.openEdit}
      deleteTarget={deleteTarget}
      deleting={model.remove.isPending}
      onConfirmDelete={handleConfirmDelete}
      onCancelDelete={() => setDeleteTarget(null)}
    />
  );
}
