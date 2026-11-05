import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { formatMoneyNote } from '#/features/recurrences/recurrence-list/utils/format-money-note.util.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

const CLOSING = 'Mudar o valor não altera o que já foi confirmado.';

/** "Confirmada em 25/09 (R$ 3.800,00), 27/08 e 24/07. Mudar o valor não altera o que já foi confirmado." */
export function buildHistoryNote(history: readonly Occurrence.Dto[], hidden: boolean): string {
  const confirmed = history.filter(
    (occurrence) => occurrence.status === 'confirmed' && occurrence.payments.length > 0,
  );
  const [first, ...others] = confirmed;
  if (!first) return `Ainda sem confirmações. ${CLOSING}`;

  const dateOf = (occurrence: Occurrence.Dto) =>
    formatShortDate(occurrence.payments.at(-1)?.occurredOn ?? occurrence.windowEndOn);
  const head = `Confirmada em ${dateOf(first)} (${formatMoneyNote(first.receivedCents, hidden)})`;
  const tail = others.map(dateOf);
  const list =
    tail.length === 0
      ? head
      : `${head}, ${tail.slice(0, -1).join(', ')}${tail.length > 1 ? ' e ' : ''}${tail.at(-1)}`;

  return `${list}. ${CLOSING}`;
}
