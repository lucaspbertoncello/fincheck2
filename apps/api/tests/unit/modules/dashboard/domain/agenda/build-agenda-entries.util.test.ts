import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { buildBillAgendaEntry } from '#/modules/dashboard/domain/agenda/build-bill-agenda-entry.util.ts';
import { buildInvoiceAgendaEntry } from '#/modules/dashboard/domain/agenda/build-invoice-agenda-entry.util.ts';
import { buildOccurrenceAgendaEntry } from '#/modules/dashboard/domain/agenda/build-occurrence-agenda-entry.util.ts';

const invoice = (overrides: Partial<Invoice.Dto> = {}): Invoice.Dto => ({
  accountId: 'card',
  month: '2026-10',
  closesOn: '2026-10-30',
  dueOn: '2026-11-06',
  status: 'open',
  breakdown: { purchasesCents: 161689, installmentsCents: 0, expectedRecurringCents: 0 },
  computedTotalCents: 161689,
  bankTotalCents: null,
  totalOverrideCents: null,
  overrideNote: null,
  totalCents: 161689,
  paidCents: 0,
  presumedPaidCents: 0,
  remainingCents: 161689,
  payments: [],
  paymentSuggestion: null,
  isEditable: true,
  ...overrides,
});

const bill = (overrides: Partial<Bill.Dto> = {}): Bill.Dto => ({
  id: 'b1',
  direction: 'payable',
  kind: 'general',
  description: 'Conta de luz',
  counterparty: null,
  amountCents: 45000,
  paidCents: 0,
  remainingCents: 45000,
  dueOn: '2026-10-28',
  categoryId: null,
  status: 'open',
  origin: null,
  payments: [],
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

const occurrence = (overrides: Partial<AgendaOccurrence> = {}): AgendaOccurrence => ({
  id: 'o1',
  recurrenceId: 'r1',
  recurrenceName: 'Academia',
  kind: 'expense',
  month: '2026-10',
  expectedOn: '2026-10-25',
  windowStartOn: '2026-10-25',
  windowEndOn: '2026-10-25',
  expectedAmountCents: 10990,
  receivedCents: 0,
  remainingCents: 10990,
  status: 'expected',
  settledAt: null,
  skippedAt: null,
  difference: null,
  needsAttention: false,
  carriedOver: false,
  payments: [],
  accountId: 'checking',
  method: 'debit',
  counterparty: null,
  categoryId: null,
  recurrencePaused: false,
  ...overrides,
});

describe('buildInvoiceAgendaEntry', () => {
  it('counts every invoice that is not paid, whatever its due date, with what it lacks', () => {
    const entry = buildInvoiceAgendaEntry({
      accountName: 'Nubank',
      invoice: invoice({ status: 'closed' }),
    });

    expect(entry?.item).toMatchObject({
      key: 'invoice:card:2026-10',
      title: 'Fatura Nubank',
      badge: 'invoice',
      flow: 'out',
      state: 'upcoming',
      invoiceState: 'closed',
      remainingCents: 161689,
      countsInFreeBalance: true,
      dueOn: '2026-11-06',
    });
    expect(entry?.movesCash).toBe(true);
  });

  it('is open while it has not closed, overdue and partial as the owner says', () => {
    expect(buildInvoiceAgendaEntry({ accountName: 'N', invoice: invoice() })?.item).toMatchObject({
      state: 'upcoming',
      invoiceState: 'open',
    });
    expect(
      buildInvoiceAgendaEntry({ accountName: 'N', invoice: invoice({ status: 'overdue' }) })?.item
        .state,
    ).toBe('overdue');
    expect(
      buildInvoiceAgendaEntry({
        accountName: 'N',
        invoice: invoice({ status: 'partial', paidCents: 1000, remainingCents: 160689 }),
      })?.item.state,
    ).toBe('partial');
  });

  it('carries the presumed payment and the payment found, and is not late while the presumed payment covers it whole', () => {
    const entry = buildInvoiceAgendaEntry({
      accountName: 'Bradesco',
      invoice: invoice({
        status: 'overdue',
        presumedPaidCents: 128490,
        remainingCents: 0,
        paymentSuggestion: {
          transactionId: 'tx',
          accountId: 'checking',
          amountCents: -128490,
          occurredOn: '2026-10-21',
          description: 'PAGAMENTO FATURA',
          isPresumed: true,
        },
      }),
    });

    expect(entry?.item).toMatchObject({
      presumedPaidCents: 128490,
      presumedTransactionId: 'tx',
      remainingCents: 0,
      state: 'upcoming',
      paymentFound: {
        transactionId: 'tx',
        accountId: 'checking',
        amountCents: -128490,
        occurredOn: '2026-10-21',
        description: 'PAGAMENTO FATURA',
      },
    });
  });

  it('settles a paid one on the day of the last payment, and does not count it', () => {
    const entry = buildInvoiceAgendaEntry({
      accountName: 'N',
      invoice: invoice({
        status: 'paid',
        paidCents: 161689,
        remainingCents: 0,
        payments: [
          { id: 'p1', amountCents: 1000, paidOn: '2026-11-02', transactionId: null },
          { id: 'p2', amountCents: 160689, paidOn: '2026-11-05', transactionId: null },
        ],
      }),
    });

    expect(entry?.item).toMatchObject({
      state: 'settled',
      settledOn: '2026-11-05',
      countsInFreeBalance: false,
    });
  });

  it('is not an item when it is projected or has nothing to pay (zero or a credit)', () => {
    expect(
      buildInvoiceAgendaEntry({ accountName: 'N', invoice: invoice({ status: 'projected' }) }),
    ).toBeNull();
    expect(
      buildInvoiceAgendaEntry({
        accountName: 'N',
        invoice: invoice({ totalCents: 0, remainingCents: 0 }),
      }),
    ).toBeNull();
    expect(
      buildInvoiceAgendaEntry({
        accountName: 'N',
        invoice: invoice({ totalCents: -500, remainingCents: 0 }),
      }),
    ).toBeNull();
  });
});

describe('buildBillAgendaEntry', () => {
  const entryOf = (dto: Bill.Dto, presumed = null as AgendaPresumed, livreEndOn = '2026-10-31') =>
    buildBillAgendaEntry({ entry: { bill: dto, presumed }, livreEndOn });
  type AgendaPresumed = Parameters<typeof buildBillAgendaEntry>[0]['entry']['presumed'];

  it('counts a bill with a due day up to the end of the month, in the Livre', () => {
    expect(entryOf(bill()).item.countsInFreeBalance).toBe(true);
    expect(entryOf(bill({ dueOn: '2026-10-31' })).item.countsInFreeBalance).toBe(true);
    expect(entryOf(bill({ dueOn: '2026-11-01' })).item.countsInFreeBalance).toBe(false);
    expect(entryOf(bill({ dueOn: '2026-08-01', status: 'overdue' })).item.countsInFreeBalance).toBe(
      true,
    );
  });

  it('keeps a bill with no due day out of the Livre (Q15) and a settled one too', () => {
    expect(entryOf(bill({ dueOn: null })).item.countsInFreeBalance).toBe(false);
    expect(
      entryOf(bill({ status: 'settled', paidCents: 45000, remainingCents: 0 })).item
        .countsInFreeBalance,
    ).toBe(false);
  });

  it('names the friend debts and gives them their badges; what a friend owes Lucas is not income', () => {
    const owed = entryOf(bill({ kind: 'friend', counterparty: 'Rafa' }));
    const owes = entryOf(bill({ kind: 'friend', direction: 'receivable', counterparty: 'Rafa' }));

    expect(owed.item).toMatchObject({
      title: 'Você deve a Rafa',
      badge: 'debt',
      flow: 'out',
      counterparty: 'Rafa',
    });
    expect(owes.item).toMatchObject({
      title: 'Rafa te deve',
      badge: 'friend_receivable',
      flow: 'in',
      countsInFreeBalance: false,
    });
    expect(owes.movesCash).toBe(false);
    expect(entryOf(bill()).item).toMatchObject({ title: 'Conta de luz', badge: 'bill' });
  });

  it('takes the presumed payment out of what is left, at most what is left, and keeps its transaction', () => {
    const presumed = {
      transactionId: 'tx',
      accountId: 'a',
      amountCents: -45000,
      occurredOn: '2026-10-20',
      description: 'PIX',
    };

    expect(entryOf(bill(), presumed).item).toMatchObject({
      presumedPaidCents: 45000,
      presumedTransactionId: 'tx',
      remainingCents: 0,
      state: 'upcoming',
    });
    // A transaction of R$ 450,50 against R$ 300,00 left presumes R$ 300,00, not more.
    expect(
      entryOf(bill({ paidCents: 15000, remainingCents: 30000, status: 'partial' }), {
        ...presumed,
        amountCents: -45050,
      }).item,
    ).toMatchObject({ presumedPaidCents: 30000, remainingCents: 0 });
    // A little under: R$ 449,50 against R$ 450,00 leaves 50 cents.
    expect(entryOf(bill(), { ...presumed, amountCents: -44950 }).item).toMatchObject({
      presumedPaidCents: 44950,
      remainingCents: 50,
    });
  });

  it('states the owner states while something is left, and settles on the last payment', () => {
    expect(entryOf(bill({ status: 'overdue', dueOn: '2026-10-10' })).item.state).toBe('overdue');
    expect(
      entryOf(bill({ status: 'partial', paidCents: 100, remainingCents: 44900 })).item.state,
    ).toBe('partial');
    expect(
      entryOf(
        bill({
          status: 'settled',
          paidCents: 45000,
          remainingCents: 0,
          payments: [
            {
              id: '1',
              amountCents: 20000,
              paidOn: '2026-10-02',
              transactionId: null,
              description: null,
            },
            {
              id: '2',
              amountCents: 25000,
              paidOn: '2026-10-09',
              transactionId: null,
              description: null,
            },
          ],
        }),
      ).item,
    ).toMatchObject({ state: 'settled', settledOn: '2026-10-09' });
  });
});

describe('buildOccurrenceAgendaEntry', () => {
  const entryOf = (value: AgendaOccurrence, isOnCard = false, isDueInLivre = false) =>
    buildOccurrenceAgendaEntry({
      occurrence: value,
      isOnCard,
      livreMonth: '2026-10',
      isDueInLivre,
    });

  it('counts what is left of an occurrence of the month, the late and the one with no day included', () => {
    expect(entryOf(occurrence())?.item.countsInFreeBalance).toBe(true);
    expect(entryOf(occurrence({ status: 'late' }))?.item).toMatchObject({
      state: 'overdue',
      countsInFreeBalance: true,
    });
    expect(entryOf(occurrence({ expectedOn: null }))?.item).toMatchObject({
      dueOn: null,
      countsInFreeBalance: true,
    });
    expect(
      entryOf(occurrence({ status: 'partial', receivedCents: 4000, remainingCents: 6990 }))?.item,
    ).toMatchObject({
      state: 'partial',
      paidCents: 4000,
      remainingCents: 6990,
    });
  });

  it('counts the one that came along from an earlier month, and not one of another month', () => {
    expect(
      entryOf(occurrence({ month: '2026-09', carriedOver: true, status: 'late' }))?.item
        .countsInFreeBalance,
    ).toBe(true);
    expect(entryOf(occurrence({ month: '2026-11' }))?.item.countsInFreeBalance).toBe(false);
  });

  it('counts an open occurrence of another month when it falls due by the end of the month of the Livre', () => {
    // The 29th of September, whose window still runs on the 1st of October.
    expect(
      entryOf(occurrence({ month: '2026-09', expectedOn: '2026-09-29' }), false, true)?.item,
    ).toMatchObject({ state: 'upcoming', countsInFreeBalance: true });
    // The 1st of November moved back to the 30th of October.
    expect(
      entryOf(occurrence({ month: '2026-11', expectedOn: '2026-10-30' }), false, true)?.item
        .countsInFreeBalance,
    ).toBe(true);
    // Without the loader saying it falls due in the Livre, an occurrence of another month does not.
    expect(
      entryOf(occurrence({ month: '2026-09', expectedOn: '2026-09-29' }))?.item.countsInFreeBalance,
    ).toBe(false);
    // Settled, nothing left or on the card: it never counts.
    expect(
      entryOf(occurrence({ month: '2026-09', status: 'confirmed', remainingCents: 0 }), false, true)
        ?.item.countsInFreeBalance,
    ).toBe(false);
    expect(entryOf(occurrence({ month: '2026-09' }), true, true)?.item.countsInFreeBalance).toBe(
      false,
    );
  });

  it('does not count an occurrence of a paused recurrence, of the month or of another one', () => {
    expect(entryOf(occurrence({ recurrencePaused: true }))?.item.countsInFreeBalance).toBe(false);
    expect(
      entryOf(occurrence({ month: '2026-09', recurrencePaused: true }), false, true)?.item
        .countsInFreeBalance,
    ).toBe(false);
    expect(
      entryOf(occurrence({ month: '2026-09', carriedOver: true, recurrencePaused: true }))?.item
        .countsInFreeBalance,
    ).toBe(false);
  });

  it('does not count a recurring expense on the card (it is in the invoice), but counts an income on it', () => {
    const onCard = entryOf(occurrence(), true);

    expect(onCard?.item.countsInFreeBalance).toBe(false);
    expect(onCard?.movesCash).toBe(false);
    expect(entryOf(occurrence({ kind: 'income' }), true)?.item.countsInFreeBalance).toBe(true);
  });

  it('settles a confirmed one on the day of its last payment, else of the mark, else of the expected day', () => {
    const settled = { status: 'confirmed', remainingCents: 0, receivedCents: 10990 } as const;

    expect(
      entryOf(
        occurrence({
          ...settled,
          payments: [
            {
              id: 'p',
              transactionId: 't',
              amountCents: 10990,
              occurredOn: '2026-10-12',
              linkedBy: 'auto',
            },
          ],
        }),
      )?.item,
    ).toMatchObject({ state: 'settled', settledOn: '2026-10-12', countsInFreeBalance: false });
    // The mark is an instant in UTC: 23:30 in São Paulo on the 14th is already the 15th in UTC.
    expect(
      entryOf(occurrence({ ...settled, settledAt: '2026-10-15T02:30:00.000Z' }))?.item.settledOn,
    ).toBe('2026-10-14');
    expect(entryOf(occurrence({ ...settled }))?.item.settledOn).toBe('2026-10-25');
  });

  it('is not an item when it was skipped, and carries the sender and the category of its recurrence', () => {
    expect(entryOf(occurrence({ status: 'skipped' }))).toBeNull();
    expect(
      entryOf(occurrence({ counterparty: 'G. PRADO', categoryId: 'cat' }))?.item,
    ).toMatchObject({
      counterparty: 'G. PRADO',
      categoryId: 'cat',
      badge: 'recurring',
      source: { type: 'occurrence', occurrenceId: 'o1', recurrenceId: 'r1' },
    });
  });
});
