import { updateOccurrenceRequestSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { ExpectedAmountView } from '#/features/recurrences/recurrence-list/expected-amount/expected-amount.view.tsx';
import { useExpectedAmountModel } from '#/features/recurrences/recurrence-list/expected-amount/expected-amount.model.ts';
import { useRecurrenceListSearch } from '#/features/recurrences/recurrence-list/hooks/use-recurrence-list-search.hook.ts';
import { isApiError } from '#/shared/api/api.error.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

type SessionProps = {
  occurrence: Occurrence.Dto;
  onSave: (id: string, cents: number) => Promise<void>;
};

function ExpectedAmountSession({ occurrence, onSave }: SessionProps) {
  const { closeModals } = useRecurrenceListSearch();
  const [cents, setCents] = useState(occurrence.expectedAmountCents);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { monthLabel } = formatMonthParts(occurrence.month);

  async function handleSubmit() {
    const parsed = updateOccurrenceRequestSchema.safeParse({ expectedAmountCents: cents });
    if (!parsed.success) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSave(occurrence.id, parsed.data.expectedAmountCents);
      closeModals();
    } catch (failure) {
      setFormError(
        isApiError(failure) ? failure.message : 'Não deu para salvar. Tente de novo em instantes.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ExpectedAmountView
      name={occurrence.recurrenceName}
      scopeLabel={`só em ${monthLabel.toLowerCase()}`}
      cents={cents}
      onChange={(next) => {
        setCents(next);
        setError(undefined);
      }}
      error={error}
      formError={formError}
      saving={saving}
      onSubmit={() => void handleSubmit()}
      onClose={closeModals}
    />
  );
}

/** "Editar valor esperado" (`?expected=<occurrenceId>`): changes the amount of one month. */
export function ExpectedAmountViewModel() {
  const { expected } = useRecurrenceListSearch();
  const { month } = useSelectedMonth();
  const { showUndoToast } = useToast();
  const model = useExpectedAmountModel(month);
  const occurrence = model.occurrences.data?.items.find((item) => item.id === expected);

  if (!expected || !occurrence) return null;

  async function handleSave(id: string, cents: number) {
    if (!occurrence) return;
    const previous = occurrence.expectedAmountCents;
    await model.update.mutateAsync({ id, body: { expectedAmountCents: cents } });
    showUndoToast({
      message: `Valor esperado de ${occurrence.recurrenceName} atualizado.`,
      onUndo: () => void model.update.mutateAsync({ id, body: { expectedAmountCents: previous } }),
    });
  }

  return <ExpectedAmountSession key={expected} occurrence={occurrence} onSave={handleSave} />;
}
