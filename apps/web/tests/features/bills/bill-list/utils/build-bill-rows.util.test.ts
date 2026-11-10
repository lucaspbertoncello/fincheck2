import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { describe, expect, it } from 'vitest';

import { buildBillRows } from '#/features/bills/bill-list/utils/build-bill-rows.util.ts';

function agendaItem(overrides: Partial<Agenda.Item>): Agenda.Item {
  return {
    key: 'k',
    source: {
      type: 'occurrence',
      billId: null,
      occurrenceId: 'o1',
      recurrenceId: 'r-netflix',
      accountId: null,
      month: null,
    },
    flow: 'out',
    title: 'Netflix',
    badge: 'recurring',
    counterparty: null,
    accountId: null,
    categoryId: null,
    dueOn: '2026-10-25',
    amountCents: 5590,
    paidCents: 0,
    presumedPaidCents: 0,
    presumedTransactionId: null,
    remainingCents: 5590,
    state: 'upcoming',
    invoiceState: null,
    settledOn: null,
    countsInFreeBalance: true,
    paymentFound: null,
    ...overrides,
  };
}

const logo = { name: 'Netflix', slug: 'netflix' } as const;
const context = {
  today: '2026-10-22',
  categoryIcons: new Map(),
  accountNames: new Map(),
  serviceLogos: new Map([['r-netflix', logo]]),
};

describe('buildBillRows friend debts', () => {
  const debt = (overrides: Partial<Agenda.Item>) =>
    agendaItem({
      key: 'bill:b1',
      source: { ...agendaItem({}).source, type: 'bill', billId: 'b1', occurrenceId: null },
      badge: 'debt',
      counterparty: 'Rafa',
      ...overrides,
    });

  it('gives a friend debt (to pay or to receive) its bill and person for the "…" menu', () => {
    expect(buildBillRows([debt({})], context)[0]?.debt).toEqual({ billId: 'b1', person: 'Rafa' });
    expect(buildBillRows([debt({ badge: 'friend_receivable' })], context)[0]?.debt).toEqual({
      billId: 'b1',
      person: 'Rafa',
    });
  });

  it('keeps the menu on a settled debt', () => {
    expect(buildBillRows([debt({ state: 'settled' })], context)[0]?.debt).toEqual({
      billId: 'b1',
      person: 'Rafa',
    });
  });

  it('gives no menu to a general bill, an invoice or a recurrence', () => {
    expect(buildBillRows([debt({ badge: 'bill' })], context)[0]?.debt).toBeUndefined();
    expect(buildBillRows([agendaItem({})], context)[0]?.debt).toBeUndefined();
  });
});

describe('buildBillRows service logo', () => {
  it('draws the logo of the recurrence the item comes from', () => {
    expect(buildBillRows([agendaItem({})], context)[0]?.service).toEqual(logo);
  });

  it('keeps the category icon while the recurrences load (no logo in the map)', () => {
    const loading = { ...context, serviceLogos: new Map() };

    expect(buildBillRows([agendaItem({})], loading)[0]?.service).toBeNull();
  });

  it('keeps the category icon for a recurrence with no logo, whatever the title says', () => {
    const item = agendaItem({
      title: 'Netflix',
      source: { ...agendaItem({}).source, recurrenceId: 'r-other' },
    });

    expect(buildBillRows([item], context)[0]?.service).toBeNull();
  });

  it('never draws a logo on an item that is not a recurrence', () => {
    expect(buildBillRows([agendaItem({ badge: 'bill' })], context)[0]?.service).toBeNull();
  });
});
