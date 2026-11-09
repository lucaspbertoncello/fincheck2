import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';

// An item of the agenda with the fields a test does not care about filled in. A test changes only
// what it is about: `item` over the item, `movesCash` and `carriedOver` over the entry.
export function buildTestAgendaEntry(
  overrides: Partial<AgendaEntry['item']> & {
    movesCash?: boolean;
    carriedOver?: boolean;
  } = {},
): AgendaEntry {
  const { movesCash = true, carriedOver = false, ...item } = overrides;

  return {
    movesCash,
    carriedOver,
    item: {
      key: 'bill:1',
      source: {
        type: 'bill',
        billId: '1',
        occurrenceId: null,
        recurrenceId: null,
        accountId: null,
        month: null,
      },
      flow: 'out',
      title: 'Conta de luz',
      badge: 'bill',
      counterparty: null,
      accountId: null,
      categoryId: null,
      dueOn: '2026-10-25',
      amountCents: 10000,
      paidCents: 0,
      presumedPaidCents: 0,
      presumedTransactionId: null,
      remainingCents: 10000,
      state: 'upcoming',
      invoiceState: null,
      settledOn: null,
      countsInFreeBalance: true,
      paymentFound: null,
      ...item,
    },
  };
}
