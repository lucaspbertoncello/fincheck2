import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { describe, expect, it } from 'vitest';

import { buildFriendsModel } from '#/features/bills/bill-list/utils/build-friends-model.util.ts';
import { buildPayableModel } from '#/features/bills/bill-list/utils/build-payable-model.util.ts';

const item = (overrides: Partial<Agenda.Item>): Agenda.Item => ({
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
  title: 'IPVA',
  badge: 'bill',
  counterparty: null,
  accountId: null,
  categoryId: null,
  dueOn: '2026-10-25',
  amountCents: 38000,
  paidCents: 0,
  presumedPaidCents: 0,
  presumedTransactionId: null,
  remainingCents: 38000,
  state: 'upcoming',
  invoiceState: null,
  settledOn: null,
  countsInFreeBalance: true,
  paymentFound: null,
  ...overrides,
});

const agenda = (overrides: Partial<Agenda.Dto>): Agenda.Dto => ({
  month: '2026-10',
  payable: { totalCents: 0, count: 0, items: [] },
  friendsReceivable: { totalCents: 0, peopleCount: 0 },
  thisMonth: [],
  openInvoices: [],
  receivable: [],
  undated: [],
  settled: [],
  ...overrides,
});

describe('buildPayableModel', () => {
  it('describes the composition of the Livre total', () => {
    const model = buildPayableModel(
      agenda({ payable: { totalCents: 38000, count: 1, items: [item({})] } }),
      '2026-10-31',
    );

    expect(model.totalCents).toBe(38000);
    expect(model.caption).toBe('1 conta, até 31/10 e faturas abertas');
    expect(model.items).toEqual([
      { key: 'bill:1', label: 'IPVA', note: 'vence 25/10', cents: 38000 },
    ]);
  });
});

describe('buildFriendsModel', () => {
  it('lists only the friends who owe, and says it is not income', () => {
    const model = buildFriendsModel(
      agenda({
        friendsReceivable: { totalCents: 5800, peopleCount: 1 },
        receivable: [
          item({
            key: 'bill:2',
            title: 'Júlia te deve',
            badge: 'friend_receivable',
            flow: 'in',
            remainingCents: 5800,
          }),
          item({ key: 'bill:3', title: 'Marina', badge: 'bill', flow: 'in' }),
        ],
      }),
    );

    expect(model.caption).toBe('1 pessoa, não conta como receita');
    expect(model.items.map((entry) => entry.label)).toEqual(['Júlia te deve']);
  });
});
