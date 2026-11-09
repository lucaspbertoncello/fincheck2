import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { RecurrenceFlow, TotalCardDetail } from '@fincheck/ui';

import { TOTAL_CARD_WORDS } from '#/features/recurrences/recurrence-list/constants/total-card-words.constant.ts';
import { formatMoneyNote } from '#/features/recurrences/utils/format-money-note.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

/**
 * The lines under the value of the card: "R$ 3.387,22 já recebidos ›" (to the transactions that
 * added up to it), "faltam R$ 1.982,80 ›" (to what is still missing) and, on the expenses, "1
 * atrasada, 1 com valor diferente". A line of R$ 0,00 has nowhere to lead: it is plain text.
 */
export function buildTotalCardDetails(
  flow: RecurrenceFlow,
  summary: Recurrence.Summary,
  month: string,
  hidden: boolean,
): TotalCardDetail[] {
  const words = TOTAL_CARD_WORDS[flow];
  const side = flow === 'income' ? summary.incomes : summary.expenses;
  if (side.count === 0) return [{ key: 'none', text: words.none }];

  const settledCents =
    flow === 'income' ? summary.incomes.receivedCents : summary.expenses.paidCents;
  const details: TotalCardDetail[] = [
    {
      key: 'settled',
      text: `${formatMoneyNote(settledCents, hidden)} ${words.settled}`,
      href:
        settledCents > 0
          ? buildHref(`/transactions?type=${flow}&recurrence=linked`, month)
          : undefined,
      srHint: words.settledHint,
    },
    {
      key: 'missing',
      text: `faltam ${formatMoneyNote(side.missingCents, hidden)}`,
      href:
        side.missingCents > 0
          ? buildHref(`/recurrences?flow=${flow}&show=missing`, month)
          : undefined,
      srHint: words.missingHint,
    },
  ];

  if (flow === 'expense') {
    const { lateCount, differentCount } = summary.expenses;
    const notes = [
      lateCount > 0 ? countWord(lateCount, 'atrasada', 'atrasadas') : null,
      differentCount > 0 ? `${differentCount} com valor diferente` : null,
    ].filter((note): note is string => note !== null);
    if (notes.length > 0) details.push({ key: 'notes', text: notes.join(', ') });
  }

  return details;
}
