import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useRecurrenceListSearch } from '#/features/recurrences/hooks/use-recurrence-list-search.hook.ts';
import { useLinkOccurrenceModel } from '#/features/recurrences/recurrence-list/link-occurrence/link-occurrence.model.ts';
import { LinkOccurrenceView } from '#/features/recurrences/recurrence-list/link-occurrence/link-occurrence.view.tsx';
import type { LinkCandidateData } from '#/features/recurrences/recurrence-list/link-occurrence/types/link-candidate.type.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

/** "Vincular transação" (`?link=<occurrenceId>`): picks the transaction that paid the occurrence. */
export function LinkOccurrenceViewModel() {
  const { link, closeModals } = useRecurrenceListSearch();
  const { month } = useSelectedMonth();
  const { showUndoToast } = useToast();
  const model = useLinkOccurrenceModel(month, link);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const occurrence = model.occurrences.data?.items.find((item) => item.id === link);
  if (!link || !occurrence) return null;

  const accountNames = new Map((model.accounts.data?.items ?? []).map((a) => [a.id, a.name]));
  const candidates: LinkCandidateData[] = (model.candidates.data?.items ?? []).map((item) => ({
    transactionId: item.transactionId,
    description: item.description,
    dateLabel: formatShortDate(item.occurredOn),
    detail:
      [item.counterparty, accountNames.get(item.accountId)].filter(Boolean).join(', ') || undefined,
    amountCents: Math.abs(item.amountCents),
    flow: item.amountCents >= 0 ? 'income' : 'expense',
  }));

  const selectedId = chosenId ?? candidates[0]?.transactionId ?? null;

  async function handleLink() {
    const transactionId = selectedId;
    if (transactionId === null) return;
    setLinking(true);
    setLinkError(null);
    try {
      const linked = await model.link.mutateAsync({ id: link as string, body: { transactionId } });
      const payment = linked.payments.find((item) => item.transactionId === transactionId);
      closeModals();
      showUndoToast({
        message: `Transação vinculada a ${occurrence?.recurrenceName}.`,
        onUndo: () => {
          if (payment) void model.unlink.mutateAsync({ id: linked.id, paymentId: payment.id });
        },
      });
    } catch (error) {
      setLinkError(getApiErrorMessage(error, 'Tente de novo em instantes.'));
    } finally {
      setLinking(false);
    }
  }

  return (
    <LinkOccurrenceView
      name={occurrence.recurrenceName}
      state={model.candidates.isError ? 'error' : model.candidates.data ? 'ready' : 'loading'}
      candidates={candidates}
      selectedId={selectedId}
      onSelect={setChosenId}
      linking={linking}
      linkError={linkError}
      onLink={() => void handleLink()}
      onRetry={() => void model.candidates.refetch()}
      onClose={closeModals}
    />
  );
}
