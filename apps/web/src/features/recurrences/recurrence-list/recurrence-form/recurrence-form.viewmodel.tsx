import { dateRuleSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useRecurrenceListSearch } from '#/features/recurrences/recurrence-list/hooks/use-recurrence-list-search.hook.ts';
import { RecurrenceFormStatusModal } from '#/features/recurrences/recurrence-list/recurrence-form/components/recurrence-form-status-modal.component.tsx';
import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-list/recurrence-form/constants/empty-form-values.constant.ts';
import { useFocusFirstInvalid } from '#/features/recurrences/recurrence-list/recurrence-form/hooks/use-focus-first-invalid.hook.ts';
import {
  useRecurrenceFormActions,
  useRecurrenceFormSource,
  useRecurrenceRulePreview,
} from '#/features/recurrences/recurrence-list/recurrence-form/recurrence-form.model.ts';
import { RecurrenceFormView } from '#/features/recurrences/recurrence-list/recurrence-form/recurrence-form.view.tsx';
import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-create-body.util.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-date-rule.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-form-values.util.ts';
import { buildHistoryNote } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-history-note.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-update-body.util.ts';
import { formatPreviewDate } from '#/features/recurrences/recurrence-list/recurrence-form/utils/format-preview-date.util.ts';
import { isApiError } from '#/shared/api/api.error.ts';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';

const FORM_ID = 'recurrence-form';

type SessionProps = {
  /** Present when editing: the saved recurrence with its history. */
  saved?: Recurrence.DetailDto;
};

function RecurrenceFormSession({ saved }: SessionProps) {
  const { closeModals } = useRecurrenceListSearch();
  const { isHidden } = useHideValues();
  const { showUndoToast } = useToast();
  const actions = useRecurrenceFormActions();

  const [values, setValues] = useState<RecurrenceFormValues>(() =>
    saved ? buildFormValues(saved) : EMPTY_FORM_VALUES,
  );
  const [errors, setErrors] = useState<RecurrenceFormErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dateRule = buildDateRule(values);
  const preview = useRecurrenceRulePreview(dateRule, dateRuleSchema.safeParse(dateRule).success);
  useFocusFirstInvalid(FORM_ID, attempt);

  function handleChange(patch: Partial<RecurrenceFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setErrors({});
    setFormError(null);
  }

  async function attemptTask(task: () => Promise<void>) {
    setFormError(null);
    try {
      await task();
    } catch (error) {
      setFormError(
        isApiError(error) ? error.message : 'Não deu para salvar. Tente de novo em instantes.',
      );
    }
  }

  function reject(found: RecurrenceFormErrors) {
    setErrors(found);
    setAttempt((count) => count + 1);
  }

  async function handleSubmit() {
    if (saved) {
      const result = buildUpdateBody(values, saved);
      if (result.status === 'unchanged') return closeModals();
      if (result.status === 'invalid') return reject(result.errors);
      await attemptTask(async () => {
        await actions.update.mutateAsync({ id: saved.id, body: result.body });
        closeModals();
      });
      return;
    }

    const result = buildCreateBody(values);
    if (result.status === 'invalid') return reject(result.errors);
    if (result.status === 'ok') {
      await attemptTask(async () => {
        await actions.create.mutateAsync(result.body);
        closeModals();
      });
    }
  }

  async function handlePause() {
    if (!saved) return;
    await attemptTask(async () => {
      if (saved.pausedAt) {
        await actions.resume.mutateAsync(saved.id);
      } else {
        await actions.pause.mutateAsync(saved.id);
        showUndoToast({
          message: `${saved.name} pausada. Saiu do Livre e das projeções.`,
          onUndo: () => void actions.resume.mutateAsync(saved.id),
        });
      }
      closeModals();
    });
  }

  async function handleDelete() {
    if (!saved) return;
    await attemptTask(async () => {
      await actions.remove.mutateAsync(saved.id);
      setConfirmingDelete(false);
      closeModals();
    });
  }

  const saving = actions.create.isPending || actions.update.isPending;

  return (
    <RecurrenceFormView
      formId={FORM_ID}
      mode={saved ? 'edit' : 'create'}
      subtitle={
        saved
          ? `${saved.name}, ativa desde ${saved.startsMonth.slice(5)}/${saved.startsMonth.slice(0, 4)}`
          : undefined
      }
      values={values}
      errors={errors}
      onChange={handleChange}
      preview={
        preview.data?.occurrences.map((item) => formatPreviewDate(item.expectedOn, item.month)) ??
        []
      }
      historyNote={saved ? buildHistoryNote(saved.history, isHidden) : undefined}
      paused={saved?.pausedAt != null}
      formError={formError}
      saving={saving}
      pausing={actions.pause.isPending || actions.resume.isPending}
      onSubmit={() => void handleSubmit()}
      onClose={closeModals}
      onPause={() => void handlePause()}
      confirmingDelete={confirmingDelete}
      deleting={actions.remove.isPending}
      onRequestDelete={() => setConfirmingDelete(true)}
      onCancelDelete={() => setConfirmingDelete(false)}
      onConfirmDelete={() => void handleDelete()}
    />
  );
}

/**
 * "Nova recorrência" (`?new=recurrence`) and "Editar recorrência" (`?edit=<recurrenceId>`), on
 * top of whatever screen is open. Mount it anywhere under the router: it renders nothing while
 * neither param is in the URL.
 */
export function RecurrenceFormViewModel() {
  const { new: creating, edit: editId, closeModals } = useRecurrenceListSearch();
  const source = useRecurrenceFormSource(editId);

  if (editId) {
    if (source.isError) return <RecurrenceFormStatusModal state="error" onClose={closeModals} />;
    if (!source.data) return <RecurrenceFormStatusModal state="loading" onClose={closeModals} />;

    return <RecurrenceFormSession key={editId} saved={source.data} />;
  }

  return creating ? <RecurrenceFormSession key="new" /> : null;
}
