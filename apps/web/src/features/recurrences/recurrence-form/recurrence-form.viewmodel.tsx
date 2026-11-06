import { dateRuleSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { useToast } from '@fincheck/ui';
import type { CategoryOption } from '@fincheck/ui';
import { useState } from 'react';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { useRecurrenceListSearch } from '#/features/recurrences/hooks/use-recurrence-list-search.hook.ts';
import { RecurrenceFormStatusModal } from '#/features/recurrences/recurrence-form/components/recurrence-form-status-modal.component.tsx';
import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-form/constants/empty-form-values.constant.ts';
import { DIALOG_INVALID_INPUT_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';
import {
  useRecurrenceFormAccounts,
  useRecurrenceFormActions,
  useRecurrenceFormCategories,
  useRecurrenceFormSource,
  useRecurrenceRulePreview,
} from '#/features/recurrences/recurrence-form/recurrence-form.model.ts';
import { RecurrenceFormView } from '#/features/recurrences/recurrence-form/recurrence-form.view.tsx';
import { buildServiceOptions } from '#/features/recurrences/recurrence-form/utils/build-service-options.util.tsx';
import { recognizeSubscriptionFields } from '#/features/recurrences/recurrence-form/utils/recognize-subscription-fields.util.ts';
import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
  SubscriptionTouched,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-form/utils/build-create-body.util.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-form/utils/build-date-rule.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-form/utils/build-form-values.util.ts';
import { buildHistoryNote } from '#/features/recurrences/recurrence-form/utils/build-history-note.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-form/utils/build-update-body.util.ts';
import { buildPreviewDates } from '#/features/recurrences/recurrence-form/utils/build-preview-dates.util.ts';
import { resolveRecurrenceMethod } from '#/features/recurrences/recurrence-form/utils/resolve-recurrence-method.util.ts';
import { applyRuleDefaults } from '#/features/recurrences/recurrence-form/utils/apply-rule-defaults.util.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { buildAccountChoices } from '#/shared/utils/build-account-choices.util.ts';

type SessionProps = {
  /** Present when editing: the saved recurrence with its history. */
  saved?: Recurrence.DetailDto;
  /** "subscription": a new one that opens as an expense on the first credit card (BR-REC-017). */
  preset?: 'subscription';
};

function RecurrenceFormSession({ saved, preset }: SessionProps) {
  const { closeModals } = useRecurrenceListSearch();
  const { isHidden } = useHideValues();
  const { showUndoToast } = useToast();
  const actions = useRecurrenceFormActions();

  const [values, setValues] = useState<RecurrenceFormValues>(() => {
    if (saved) return buildFormValues(saved);
    return preset === 'subscription'
      ? { ...EMPTY_FORM_VALUES, isSubscription: true }
      : EMPTY_FORM_VALUES;
  });
  // What was touched by hand stops being filled from the name: a saved recurrence keeps what it
  // has, and the "+" of Assinaturas starts with the switch on (the service still follows the name).
  const [touched, setTouched] = useState<SubscriptionTouched>({
    isSubscription: saved !== undefined || preset === 'subscription',
    serviceSlug: saved !== undefined,
  });
  const [cardPicked, setCardPicked] = useState(false);
  const [errors, setErrors] = useState<RecurrenceFormErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categoriesQuery = useRecurrenceFormCategories(values.kind);
  const accountsQuery = useRecurrenceFormAccounts();
  const accountItems = accountsQuery.data?.items ?? [];
  // The "+" of Assinaturas: once the accounts arrive, the first credit card comes chosen.
  const firstCardId = accountItems.find((account) => account.type === 'credit_card')?.id ?? null;
  if (preset === 'subscription' && !cardPicked && firstCardId !== null) {
    setCardPicked(true);
    setValues((current) =>
      current.accountId === null ? { ...current, accountId: firstCardId } : current,
    );
  }
  const method = resolveRecurrenceMethod(values.accountId, accountItems);
  const dateRule = buildDateRule(values);
  const ruleComplete = dateRuleSchema.safeParse(dateRule).success;
  const preview = useRecurrenceRulePreview(dateRule, ruleComplete);
  const previewStatus = (() => {
    if (!ruleComplete) return 'incomplete' as const;
    if (preview.data) return 'ready' as const;
    return preview.isError ? ('unavailable' as const) : ('loading' as const);
  })();
  useFocusFirstInvalid({
    attempt,
    selector: DIALOG_INVALID_INPUT_SELECTOR,
    scope: 'document',
  });

  function handleChange(patch: Partial<RecurrenceFormValues>) {
    const nextTouched: SubscriptionTouched =
      'isSubscription' in patch || 'serviceSlug' in patch
        ? {
            isSubscription: touched.isSubscription || 'isSubscription' in patch,
            serviceSlug: touched.serviceSlug || 'serviceSlug' in patch,
          }
        : touched;
    setValues((current) => {
      const next = { ...current, ...patch };
      // Income never falls on a credit card: switching to it drops a card that was chosen.
      if (patch.kind === 'income' && resolveRecurrenceMethod(next.accountId, accountItems)) {
        next.accountId = null;
      }
      // A name (or extract text) of a known service turns the subscription on, until Lucas decides.
      if ('name' in patch || 'matchText' in patch || 'kind' in patch) {
        Object.assign(next, recognizeSubscriptionFields(next, nextTouched));
      }
      // A new rule type opens complete: its numbers come filled with the example of its card.
      return patch.ruleType ? { ...next, ...applyRuleDefaults(next) } : next;
    });
    if (nextTouched !== touched) setTouched(nextTouched);
    setErrors({});
    setFormError(null);
  }

  async function attemptTask(task: () => Promise<void>) {
    setFormError(null);
    try {
      await task();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Não deu para salvar. Tente de novo em instantes.'));
    }
  }

  function reject(found: RecurrenceFormErrors) {
    setErrors(found);
    setAttempt((count) => count + 1);
  }

  async function handleSubmit() {
    if (saved) {
      const result = buildUpdateBody(values, saved, method);
      if (result.status === 'unchanged') return closeModals();
      if (result.status === 'invalid') return reject(result.errors);
      await attemptTask(async () => {
        await actions.update.mutateAsync({ id: saved.id, body: result.body });
        closeModals();
      });
      return;
    }

    const result = buildCreateBody(values, method);
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

  const categories: CategoryOption[] = [...(categoriesQuery.data?.items ?? [])]
    .sort((a, b) => b.transactionCount - a.transactionCount || a.name.localeCompare(b.name))
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: mapCategoryIcon(category.icon),
    }));
  // An expense can fall on a credit card (its occurrence enters the projected invoice); income cannot.
  const accounts = buildAccountChoices(
    accountItems.filter((account) => values.kind === 'expense' || account.type !== 'credit_card'),
  );
  const chosenCategoryIcon = categories.find((category) => category.id === values.categoryId)?.icon;
  const serviceOptions = buildServiceOptions(chosenCategoryIcon);
  const saving = actions.create.isPending || actions.update.isPending;

  return (
    <RecurrenceFormView
      mode={saved ? 'edit' : 'create'}
      subtitle={
        saved
          ? `${saved.name}, ativa desde ${saved.startsMonth.slice(5)}/${saved.startsMonth.slice(0, 4)}`
          : undefined
      }
      values={values}
      errors={errors}
      onChange={handleChange}
      previewDates={buildPreviewDates(preview.data?.occurrences ?? [], values.ruleType, values.day)}
      previewStatus={previewStatus}
      categories={categories}
      accounts={accounts}
      serviceOptions={serviceOptions}
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

  if (creating === 'subscription')
    return <RecurrenceFormSession key="new-subscription" preset="subscription" />;

  return creating ? <RecurrenceFormSession key="new" /> : null;
}
