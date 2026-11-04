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

function build(freeBalance: FreeBalance.Dto) {
  return buildFreeBalanceData({
    freeBalance,
    accounts: [],
    accountsHref: '/accounts?month=2026-10',
    now: NOW,
  });
}

describe('buildFreeBalanceData', () => {
  it('puts the sum of the account balances in the big number and the old Livre in the closing line', () => {
    const freeBalance = base();
    const data = build(freeBalance);

    expect(data.balanceCents).toBe(freeBalance.accounts.totalCents);
    expect(data.freeCents).toBe(freeBalance.freeBalanceCents);
    expect(data.perDayCents).toBe(freeBalance.perDayCents);
    expect(data.windowDays).toBe(freeBalance.daysRemaining);
    expect(data.moreAccountsHref).toBe('/accounts?month=2026-10');
  });

  it('keeps only "A receber" and "A pagar" in the lines, with no balance line', () => {
    expect(build(base()).lines.map((line) => line.key)).toEqual(['receivable', 'payable']);
  });

  it('marks an item with a detected payment as "pago, falta vincular" (R1)', () => {
    const freeBalance = base();
    const [item] = freeBalance.payable.items;
    expect(item).toBeDefined();
    item!.presumedPaidCents = 1000;
    item!.presumedTransactionId = 'tx-1';

    const payable = build(freeBalance).lines.find((line) => line.key === 'payable');

    expect(payable?.items[0]?.label).toBe(item!.title);
    expect(payable?.items[0]?.badge).toBe('pago, falta vincular');
    expect(payable?.items[0]?.cents).toBe(item!.remainingCents);
  });

  it('counts the receivable ("5 previstos"), so no name can be cut in the narrow column', () => {
    const { receivable } = base();
    const line = build(base()).lines.find((item) => item.key === 'receivable');

    expect(line?.subtitle).toBe(
      receivable.items.length === 1 ? '1 previsto' : `${receivable.items.length} previstos`,
    );
    expect(line?.subtitle).not.toMatch(/R\$/);
  });

  it('says the day the payable line goes until', () => {
    const payable = build(base()).lines.find((line) => line.key === 'payable');

    expect(payable?.subtitle).toBe('até 31/10');
  });
});

describe('buildFreeBalanceData, partial balance (R2)', () => {
  it('carries the partial notice for the panel', () => {
    const freeBalance = { ...base(), isPartial: true, accountsWithoutBalance: ['a1'] };

    const data = buildFreeBalanceData({
      freeBalance,
      accounts: [{ id: 'a1', name: 'Nubank' }] as never,
      accountsHref: '/accounts',
      now: NOW,
    });

    expect(data.partialNote).toBe('Saldo parcial: falta o saldo do Nubank');
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
      'Saldo parcial: falta o saldo do Nubank',
    );
  });
});
