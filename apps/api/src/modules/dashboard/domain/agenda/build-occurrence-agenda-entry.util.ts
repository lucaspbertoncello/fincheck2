import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { latestDate } from '#/modules/dashboard/domain/agenda/latest-date.util.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

// An occurrence of a recurrence as an item of the agenda; a skipped one is not an item. An expense
// on a card does not count in the Livre on its own (`countsInFreeBalance` false, `movesCash`
// false): it leaves with the invoice, which already adds what is still expected of it. The others
// count while something is left of them and their recurrence is not paused, when they belong to the
// month of the Livre (`livreMonth`), came along from an earlier one (late, from the last 3 months)
// or, being open in another month, fall due by the end of the month of the Livre (`isDueInLivre`,
// decided by the loader); that includes the late ones and the ones with no day.
export function buildOccurrenceAgendaEntry(input: {
  occurrence: AgendaOccurrence;
  isOnCard: boolean;
  livreMonth: string;
  isDueInLivre?: boolean;
}): AgendaEntry | null {
  const { occurrence } = input;
  if (occurrence.status === 'skipped') return null;

  const isSettled = occurrence.status === 'confirmed';
  const onCard = occurrence.kind === 'expense' && input.isOnCard;
  const inLivreMonth =
    occurrence.month === input.livreMonth ||
    occurrence.carriedOver ||
    (input.isDueInLivre ?? false);

  return {
    movesCash: !onCard,
    carriedOver: occurrence.carriedOver,
    item: {
      key: `occurrence:${occurrence.id}`,
      source: {
        type: 'occurrence',
        billId: null,
        occurrenceId: occurrence.id,
        recurrenceId: occurrence.recurrenceId,
        accountId: occurrence.accountId,
        month: null,
      },
      flow: occurrence.kind === 'income' ? 'in' : 'out',
      title: occurrence.recurrenceName,
      badge: 'recurring',
      counterparty: occurrence.counterparty,
      accountId: occurrence.accountId,
      categoryId: occurrence.categoryId,
      dueOn: occurrence.expectedOn,
      amountCents: occurrence.expectedAmountCents,
      paidCents: occurrence.receivedCents,
      presumedPaidCents: 0,
      presumedTransactionId: null,
      remainingCents: occurrence.remainingCents,
      state: isSettled
        ? 'settled'
        : occurrence.status === 'late'
          ? 'overdue'
          : occurrence.status === 'partial'
            ? 'partial'
            : 'upcoming',
      invoiceState: null,
      settledOn: isSettled
        ? (latestDate(occurrence.payments.map((payment) => payment.occurredOn)) ??
          (occurrence.settledAt ? businessDateOfInstant(occurrence.settledAt).value : null) ??
          occurrence.expectedOn ??
          occurrence.windowEndOn)
        : null,
      countsInFreeBalance:
        !isSettled &&
        !onCard &&
        !occurrence.recurrencePaused &&
        inLivreMonth &&
        occurrence.remainingCents > 0,
      paymentFound: null,
    },
  };
}
