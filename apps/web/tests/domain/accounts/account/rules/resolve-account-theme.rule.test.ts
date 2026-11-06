import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { describe, expect, it } from 'vitest';

import { resolveAccountTheme } from '#/domain/accounts/account/rules/resolve-account-theme.rule.ts';

function card(code: Account.Dto['institutionCode'], themeId: string | null): Account.Dto {
  return {
    id: 'a',
    type: 'credit_card',
    source: 'pluggy',
    name: 'Cartão',
    institutionCode: code,
    institutionName: null,
    balanceCents: null,
    balanceAt: null,
    connection: null,
    creditCard: { brand: 'visa', last4: null, closingDay: 1, dueDay: 8, limitCents: null, themeId },
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveAccountTheme', () => {
  it('uses the bank theme from the institution code (same ids as the theme catalog)', () => {
    expect(resolveAccountTheme(card('nubank', null))).toBe('nubank');
  });

  it('prefers the variant of the card when the theme id is in the catalog', () => {
    expect(resolveAccountTheme(card('nubank', 'nubank-ultravioleta'))).toBe('nubank-ultravioleta');
  });

  it('falls back to the neutral theme for a bank outside the catalog, and ignores an unknown theme id', () => {
    expect(resolveAccountTheme(card('other', null))).toBe('fallback');
    expect(resolveAccountTheme(card('nubank', 'does-not-exist'))).toBe('nubank');
  });
});
