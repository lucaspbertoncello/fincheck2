import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { describe, expect, it } from 'vitest';

import { buildCardFace } from '#/domain/accounts/account/rules/build-card-face.rule.ts';

const card: Account.Dto = {
  id: 'c1',
  type: 'credit_card',
  source: 'pluggy',
  name: 'Roxinho',
  institutionCode: 'nubank',
  institutionName: 'Nubank',
  balanceCents: null,
  balanceAt: null,
  connection: null,
  creditCard: {
    brand: 'visa',
    last4: '4821',
    closingDay: 30,
    dueDay: 6,
    limitCents: null,
    themeId: null,
  },
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('buildCardFace', () => {
  it('builds what the bank card draws', () => {
    expect(buildCardFace(card)).toEqual({
      theme: 'nubank',
      nickname: 'Roxinho',
      last4: '4821',
      dueLabel: 'Vence dia 06',
      bankName: 'Nubank',
    });
  });

  it('survives a card without details', () => {
    const face = buildCardFace({ ...card, creditCard: null, institutionName: null });
    expect(face.last4).toBe('');
    expect(face.bankName).toBeUndefined();
  });
});
