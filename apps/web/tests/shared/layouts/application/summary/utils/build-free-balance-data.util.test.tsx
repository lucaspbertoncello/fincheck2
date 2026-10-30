import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';
import { describe, expect, it } from 'vitest';

import {
  buildFreeBalanceData,
  buildPartialNotice,
} from '#/shared/layouts/application/summary/utils/build-free-balance-data.util.tsx';
import { computeFreeBalance } from '#mocks/dashboard/free-balance/compute-free-balance.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';

const NOW = new Date('2026-10-30T15:00:00-03:00');

function base(): FreeBalance.Dto {
  return structuredClone(computeFreeBalance(db));
}

function build(freeBalance: FreeBalance.Dto, isHidden = false) {
  return buildFreeBalanceData({
    freeBalance,
    accounts: [],
    openInvoices: [],
    reviewHref: '/transactions/review?month=2026-10',
    isHidden,
    now: NOW,
  });
}

describe('buildFreeBalanceData', () => {
  it('maps the Livre, the per-day value and the window of days', () => {
    const freeBalance = base();
    const data = build(freeBalance);

    expect(data.freeCents).toBe(freeBalance.freeBalanceCents);
    expect(data.perDayCents).toBe(freeBalance.perDayCents);
    expect(data.windowDays).toBe(freeBalance.daysRemaining);
    expect(data.lines.map((line) => line.key)).toEqual(['balance', 'receivable', 'payable']);
    expect(data.lines[0]?.items).toHaveLength(freeBalance.accounts.items.length);
  });

  it('marks an item with a detected payment as "pago, falta vincular" (R1)', () => {
    const freeBalance = base();
    const [item] = freeBalance.payable.items;
    expect(item).toBeDefined();
    item!.presumedPaidCents = 1000;
    item!.presumedTransactionId = 'tx-1';

    const payable = build(freeBalance).lines.find((line) => line.key === 'payable');

    expect(payable?.items[0]?.label).toBe(`${item!.title} · pago, falta vincular`);
    expect(payable?.items[0]?.cents).toBe(item!.remainingCents);
  });

  it('never writes an amount in the subtitle when the values are hidden', () => {
    const freeBalance = base();
    const visible = build(freeBalance).lines.find((line) => line.key === 'receivable');
    const hidden = build(freeBalance, true).lines.find((line) => line.key === 'receivable');

    expect(visible?.subtitle).toMatch(/R\$ \d/);
    expect(hidden?.subtitle).toContain('R$ ••••');
    expect(hidden?.subtitle).not.toMatch(/R\$ \d/);
  });

  it('says the day the payable line goes until', () => {
    const payable = build(base()).lines.find((line) => line.key === 'payable');

    expect(payable?.subtitle).toBe('até 31/10 e faturas abertas');
  });

  it('shows "Para revisar" only with something to review, and links it', () => {
    const freeBalance = base();
    freeBalance.review = { count: 12, byAccount: [] };
    expect(build(freeBalance).review).toEqual({
      count: 12,
      subtitle: 'Sem categoria',
      href: '/transactions/review?month=2026-10',
    });

    freeBalance.review = { count: 0, byAccount: [] };
    expect(build(freeBalance).review).toBeUndefined();
  });

  it('writes the stale chip with the age of the bank data', () => {
    const freeBalance = base();
    freeBalance.dataFreshness = [
      {
        connectionId: 'c1',
        institutionName: 'Bradesco',
        status: 'active',
        lastBankUpdateAt: '2026-10-29T18:40:00-03:00',
        isStale: true,
      },
      {
        connectionId: 'c2',
        institutionName: 'Nubank',
        status: 'error',
        lastBankUpdateAt: null,
        isStale: false,
      },
    ];

    expect(build(freeBalance).staleNote).toBe(
      'dado do Bradesco de ontem · conexão do Nubank com erro',
    );
  });
});

describe('buildPartialNotice', () => {
  it('is undefined when every balance is known', () => {
    expect(buildPartialNotice({ ...base(), isPartial: false }, [])).toBeUndefined();
  });

  it('names the account without balance (R2)', () => {
    const freeBalance = { ...base(), isPartial: true, accountsWithoutBalance: ['a1'] };
    const accounts = [{ id: 'a1', name: 'Nubank' }] as never;

    expect(buildPartialNotice(freeBalance, accounts)).toBe(
      'Livre parcial: falta o saldo do Nubank',
    );
  });
});
