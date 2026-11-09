import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import type { AgendaBill } from '#/modules/dashboard/domain/agenda/agenda-bill.type.ts';
import { resolvePresumedConflicts } from '#/modules/dashboard/domain/agenda/resolve-presumed-conflicts.util.ts';

const invoiceOf = (transactionId: string, dueOn: string, month = '2026-10'): Invoice.OpenItem => ({
  accountId: 'card',
  invoice: {
    accountId: 'card',
    month,
    closesOn: '2026-10-20',
    dueOn,
    status: 'closed',
    breakdown: { purchasesCents: 10000, installmentsCents: 0, expectedRecurringCents: 0 },
    computedTotalCents: 10000,
    bankTotalCents: null,
    totalOverrideCents: null,
    overrideNote: null,
    totalCents: 10000,
    paidCents: 0,
    presumedPaidCents: 10000,
    remainingCents: 0,
    payments: [],
    paymentSuggestion: {
      transactionId,
      accountId: 'checking',
      amountCents: -10000,
      occurredOn: '2026-10-21',
      description: 'PAGAMENTO',
      isPresumed: true,
    },
    isEditable: true,
    paidBeforeFincheck: false,
  },
});

const billOf = (id: string, transactionId: string, dueOn: string): AgendaBill => ({
  bill: {
    id,
    direction: 'payable',
    kind: 'general',
    description: id,
    counterparty: null,
    amountCents: 10000,
    paidCents: 0,
    remainingCents: 10000,
    dueOn,
    categoryId: null,
    status: 'open',
    origin: null,
    payments: [],
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  } satisfies Bill.Dto,
  presumed: {
    transactionId,
    accountId: 'checking',
    amountCents: -10000,
    occurredOn: '2026-10-21',
    description: 'PIX',
  },
});

describe('resolvePresumedConflicts', () => {
  it('leaves alone what claims a transaction of its own', () => {
    const input = {
      invoices: [invoiceOf('t1', '2026-10-28')],
      bills: [billOf('b', 't2', '2026-10-30')],
    };

    expect(resolvePresumedConflicts(input)).toEqual(input);
  });

  it('gives a transaction to the item that falls due first: the bill, here, and the invoice counts in full', () => {
    const result = resolvePresumedConflicts({
      invoices: [invoiceOf('t1', '2026-11-06')],
      bills: [billOf('b', 't1', '2026-10-25')],
    });

    expect(result.bills[0]?.presumed?.transactionId).toBe('t1');
    expect(result.invoices[0]?.invoice).toMatchObject({
      presumedPaidCents: 0,
      remainingCents: 10000,
      paymentSuggestion: { transactionId: 't1' },
    });
  });

  it('gives it to the invoice when it falls due first, and on the same day an invoice comes before a bill', () => {
    const first = resolvePresumedConflicts({
      invoices: [invoiceOf('t1', '2026-10-28')],
      bills: [billOf('b', 't1', '2026-10-30')],
    });
    expect(first.invoices[0]?.invoice.presumedPaidCents).toBe(10000);
    expect(first.bills[0]?.presumed).toBeNull();

    const sameDay = resolvePresumedConflicts({
      invoices: [invoiceOf('t1', '2026-10-30')],
      bills: [billOf('b', 't1', '2026-10-30')],
    });
    expect(sameDay.invoices[0]?.invoice.presumedPaidCents).toBe(10000);
    expect(sameDay.bills[0]?.presumed).toBeNull();
  });

  it('keeps one of three bills that claim the same transaction: the one due first', () => {
    const result = resolvePresumedConflicts({
      invoices: [],
      bills: [
        billOf('c', 't1', '2026-10-30'),
        billOf('a', 't1', '2026-10-20'),
        billOf('b', 't1', '2026-10-25'),
      ],
    });

    expect(
      result.bills.map((entry) => [entry.bill.id, entry.presumed?.transactionId ?? null]),
    ).toEqual([
      ['c', null],
      ['a', 't1'],
      ['b', null],
    ]);
  });
});
