import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { describe, expect, it } from 'vitest';

import { listFoundFriendPayments } from '#/domain/bills/bill/rules/list-found-friend-payments.rule.ts';

function friendItem(overrides: Partial<Agenda.Item> = {}): Agenda.Item {
  return {
    key: 'bill:b1',
    source: {
      type: 'bill',
      billId: 'b1',
      occurrenceId: null,
      recurrenceId: null,
      accountId: null,
      month: null,
    },
    flow: 'in',
    title: 'Júlia te deve',
    badge: 'friend_receivable',
    counterparty: 'Júlia',
    accountId: null,
    categoryId: null,
    dueOn: '2026-11-10',
    amountCents: 10_000,
    paidCents: 0,
    presumedPaidCents: 10_000,
    presumedTransactionId: 't1',
    remainingCents: 0,
    state: 'upcoming',
    invoiceState: null,
    settledOn: null,
    countsInFreeBalance: false,
    paymentFound: null,
    ...overrides,
  };
}

describe('listFoundFriendPayments', () => {
  it('gives the Pix found for a debt a friend owes: value, debt and transaction', () => {
    const found = listFoundFriendPayments([friendItem()]);

    expect([...found.keys()]).toEqual(['JULIA']);
    expect(found.get('JULIA')).toEqual([
      { billId: 'b1', transactionId: 't1', amountCents: 10_000, item: friendItem() },
    ]);
  });

  it('groups the spellings of one person under the key of the balances', () => {
    const found = listFoundFriendPayments([
      friendItem(),
      friendItem({
        key: 'bill:b2',
        source: { ...friendItem().source, billId: 'b2' },
        counterparty: 'JULIA',
        presumedTransactionId: 't2',
        presumedPaidCents: 2_500,
      }),
    ]);

    expect([...found.keys()]).toEqual(['JULIA']);
    expect(found.get('JULIA')?.map((entry) => [entry.billId, entry.amountCents])).toEqual([
      ['b1', 10_000],
      ['b2', 2_500],
    ]);
  });

  it('keeps each person apart, one entry per Pix', () => {
    const found = listFoundFriendPayments([
      friendItem(),
      friendItem({
        key: 'bill:b3',
        source: { ...friendItem().source, billId: 'b3' },
        counterparty: 'Rafa',
        presumedTransactionId: 't3',
      }),
    ]);

    expect(found.get('JULIA')).toHaveLength(1);
    expect(found.get('RAFA')).toHaveLength(1);
  });

  it('skips an item with no presumed payment, with the value at zero or with no transaction', () => {
    const found = listFoundFriendPayments([
      friendItem({ presumedPaidCents: 0, presumedTransactionId: null }),
      friendItem({ key: 'bill:b4', presumedPaidCents: 0 }),
      friendItem({ key: 'bill:b5', presumedTransactionId: null }),
    ]);

    expect(found.size).toBe(0);
  });

  it('skips what you owe: a debt of yours, a general bill and an invoice', () => {
    const found = listFoundFriendPayments([
      friendItem({ flow: 'out', badge: 'debt', title: 'Você deve a Júlia' }),
      friendItem({ badge: 'bill', counterparty: null }),
      friendItem({
        badge: 'invoice',
        source: { ...friendItem().source, type: 'invoice', billId: null },
      }),
    ]);

    expect(found.size).toBe(0);
  });

  it('skips a debt with no person to put it under', () => {
    expect(listFoundFriendPayments([friendItem({ counterparty: null })]).size).toBe(0);
  });

  it('gives nothing for an empty agenda', () => {
    expect(listFoundFriendPayments([]).size).toBe(0);
  });
});
