import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { AgendaBill } from '#/modules/dashboard/domain/agenda/agenda-bill.type.ts';

// A transaction presumes at most one item (the "Sem contar duas vezes" of the Livre): the one that
// falls due first; on the same day an invoice comes before a bill. The others lose the presumption
// and count what they lack in full, the transaction staying only a suggestion for them (an invoice
// keeps its `paymentSuggestion`). An invoice that loses has its `remainingCents` worked out again
// without the presumed amount.
export function resolvePresumedConflicts(input: {
  invoices: Invoice.OpenItem[];
  bills: AgendaBill[];
}): { invoices: Invoice.OpenItem[]; bills: AgendaBill[] } {
  const claims: { key: string; transactionId: string; dueOn: string; rank: number }[] = [];
  for (const { accountId, invoice } of input.invoices) {
    if (invoice.presumedPaidCents > 0 && invoice.paymentSuggestion) {
      claims.push({
        key: `invoice:${accountId}:${invoice.month}`,
        transactionId: invoice.paymentSuggestion.transactionId,
        dueOn: invoice.dueOn,
        rank: 0,
      });
    }
  }
  for (const { bill, presumed } of input.bills) {
    if (presumed && bill.dueOn !== null) {
      claims.push({
        key: `bill:${bill.id}`,
        transactionId: presumed.transactionId,
        dueOn: bill.dueOn,
        rank: 1,
      });
    }
  }

  const winners = new Set<string>();
  const taken = new Set<string>();
  for (const claim of claims.toSorted(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || a.rank - b.rank || a.key.localeCompare(b.key),
  )) {
    if (taken.has(claim.transactionId)) continue;
    taken.add(claim.transactionId);
    winners.add(claim.key);
  }

  return {
    invoices: input.invoices.map((entry) => {
      const { accountId, invoice } = entry;
      const loses =
        invoice.presumedPaidCents > 0 && !winners.has(`invoice:${accountId}:${invoice.month}`);

      return loses
        ? {
            accountId,
            invoice: {
              ...invoice,
              presumedPaidCents: 0,
              remainingCents: Math.max(0, invoice.totalCents - invoice.paidCents),
            },
          }
        : entry;
    }),
    bills: input.bills.map((entry) =>
      entry.presumed && !winners.has(`bill:${entry.bill.id}`)
        ? { ...entry, presumed: null }
        : entry,
    ),
  };
}
