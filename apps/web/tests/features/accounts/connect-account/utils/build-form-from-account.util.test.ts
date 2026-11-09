import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { describe, expect, it } from 'vitest';

import { buildFormFromAccount } from '#/features/accounts/connect-account/utils/build-form-from-account.util.ts';

const base: Account.Dto = {
  id: '0190a000-0000-7000-8000-000000000001',
  type: 'credit_card',
  source: 'manual',
  name: 'Roxinho',
  institutionCode: 'nubank',
  institutionName: null,
  balanceCents: null,
  balanceAt: null,
  connection: null,
  creditCard: {
    brand: 'mastercard',
    last4: '4821',
    closingDay: 25,
    dueDay: 6,
    limitCents: 500_000,
    themeId: null,
  },
  archivedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('buildFormFromAccount', () => {
  it('turns a card into the form that created it, with the days as text', () => {
    expect(buildFormFromAccount(base)).toMatchObject({
      type: 'credit_card',
      name: 'Roxinho',
      institutionCode: 'nubank',
      brand: 'mastercard',
      last4: '4821',
      closingDay: '25',
      dueDay: '6',
      limitCents: 500_000,
    });
  });

  it('leaves the bank empty for a wallet, which has none', () => {
    const wallet: Account.Dto = {
      ...base,
      type: 'wallet',
      institutionCode: 'wallet',
      creditCard: null,
      balanceCents: 1_000,
    };

    expect(buildFormFromAccount(wallet).institutionCode).toBe('');
  });
});

describe('buildFormFromAccount, the balance of the preview', () => {
  const checking: Account.Dto = {
    ...base,
    type: 'checking',
    creditCard: null,
    balanceCents: 348_615,
    balanceAt: '2026-11-09T10:00:00.000Z',
  };

  it('carries the balance the account has now, so the preview does not say R$ 0,00', () => {
    expect(buildFormFromAccount(checking).initialBalanceCents).toBe(348_615);
  });

  it('carries a negative balance as it is', () => {
    expect(buildFormFromAccount({ ...checking, balanceCents: -1_250 }).initialBalanceCents).toBe(
      -1_250,
    );
  });

  it('falls back to zero while the bank has not reported a balance', () => {
    expect(buildFormFromAccount({ ...checking, balanceCents: null }).initialBalanceCents).toBe(0);
  });
});
