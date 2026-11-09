// What the card needs and the bank may not send: the closing day and the due day (1 to 31). The due
// day comes from the card, else from the latest invoice the bank closed, else it is the 10th; the
// closing day comes from the card, else it is 7 days before the due day (the usual gap). Lucas can
// correct both in the card, and a correction is never overwritten by the sync.
export function computeCardDays(input: {
  closingDay: number | null;
  dueDay: number | null;
  invoiceDueOns: readonly string[];
}): { closingDay: number; dueDay: number } {
  const latest = input.invoiceDueOns.toSorted().at(-1);
  const fromInvoice = latest === undefined ? null : Number(latest.slice(8, 10));
  const dueDay = input.dueDay ?? fromInvoice ?? 10;
  let closingDay = input.closingDay ?? dueDay - 7;
  if (closingDay < 1) closingDay += 30;

  return { closingDay, dueDay };
}
