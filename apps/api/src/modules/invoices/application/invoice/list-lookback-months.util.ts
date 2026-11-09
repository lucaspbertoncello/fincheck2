import { Month } from '#/shared/date/month.value-object.ts';

// The months of a card worth looking at for an invoice still to pay: the open one, and the last
// three before it that have a row or a transaction (an older invoice with no payment is almost
// always a payment that did not match, not a debt, decided by the PM on 08/11/2026). Oldest first.
export function listLookbackMonths(
  openMonth: Month,
  monthsWithActivity: Iterable<string>,
): Month[] {
  const oldest = openMonth.previous().previous().previous();

  return [...new Set(monthsWithActivity)]
    .filter((month) => month < openMonth.value && month >= oldest.value)
    .toSorted()
    .map((month) => Month.of(month));
}
