import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { daysBetween } from '#/shared/utils/date/days-between.util.ts';
import { formatMoneyNote } from '#/features/recurrences/utils/format-money-note.util.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';
import { getOccurrenceRowStatus } from '#/domain/recurrences/occurrence/rules/get-occurrence-row-status.rule.ts';

type NoteContext = { today: string; hidden: boolean };

function relativeDays(expectedOn: string, today: string): string {
  const days = daysBetween(today, expectedOn);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}

/** The second line of the state column ("Recebido 07/10", "Em 3 dias", "Venceu 20/10, ..."). */
export function buildOccurrenceStatusNote(
  occurrence: Occurrence.Dto,
  { today, hidden }: NoteContext,
): string {
  const income = occurrence.kind === 'income';
  const lastPayment = occurrence.payments.at(-1);

  switch (getOccurrenceRowStatus(occurrence)) {
    case 'dismissed':
      return 'Dispensada neste mês';
    case 'received':
      if (lastPayment) {
        return `${income ? 'Recebido' : 'Pago'} ${formatShortDate(lastPayment.occurredOn)}`;
      }
      return income ? 'Marcada como recebida' : 'Marcada como paga';
    case 'different': {
      const amount = occurrence.difference?.amountCents ?? 0;
      const direction = amount > 0 ? 'a mais' : 'a menos';
      const verb = income ? 'Recebido' : 'Cobrado';
      return `${verb} ${formatMoneyNote(occurrence.receivedCents, hidden)}, ${formatMoneyNote(Math.abs(amount), hidden)} ${direction}`;
    }
    case 'partial': {
      const count = occurrence.payments.length;
      const noun = income ? 'recebimento' : 'pagamento';
      const last = lastPayment ? `, o último em ${formatShortDate(lastPayment.occurredOn)}` : '';
      return `${count} ${count === 1 ? noun : `${noun}s`}${last}`;
    }
    case 'late': {
      const due = formatShortDate(occurrence.expectedOn ?? occurrence.windowEndOn);
      return occurrence.payments.length > 0
        ? `Venceu ${due}, faltam ${formatMoneyNote(occurrence.remainingCents, hidden)}`
        : `Venceu ${due}, sem pagamento ligado`;
    }
    case 'expected':
      if (!occurrence.expectedOn) return 'Qualquer dia do mês';
      if (occurrence.expectedOn >= today) return relativeDays(occurrence.expectedOn, today);
      return `Esperado até ${formatShortDate(occurrence.windowEndOn)}`;
    default:
      return '';
  }
}
