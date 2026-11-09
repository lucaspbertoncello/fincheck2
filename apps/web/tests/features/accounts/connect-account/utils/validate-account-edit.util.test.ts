import { describe, expect, it } from 'vitest';

import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { validateAccountEdit } from '#/features/accounts/connect-account/utils/validate-account-edit.util.ts';

const card: ManualAccountForm = {
  type: 'credit_card',
  name: ' Roxinho ',
  institutionCode: 'nubank',
  institutionName: '',
  initialBalanceCents: 0,
  brand: 'mastercard',
  last4: '',
  closingDay: '25',
  dueDay: '6',
  limitCents: 0,
};

describe('validateAccountEdit', () => {
  it('builds the patch of a card: empty last digits and limit go as null so they can be cleared', () => {
    expect(validateAccountEdit(card)).toEqual({
      ok: true,
      body: {
        name: 'Roxinho',
        institutionCode: 'nubank',
        institutionName: null,
        creditCard: {
          brand: 'mastercard',
          last4: null,
          closingDay: 25,
          dueDay: 6,
          limitCents: null,
        },
      },
    });
  });

  it('sends the name of a bank that is not in the list', () => {
    const result = validateAccountEdit({
      ...card,
      type: 'checking',
      institutionCode: 'other',
      institutionName: ' Banco Novo ',
      closingDay: '',
      dueDay: '',
    });

    expect(result).toEqual({
      ok: true,
      body: { name: 'Roxinho', institutionCode: 'other', institutionName: 'Banco Novo' },
    });
  });

  it('keeps the same messages as the creation when a field is wrong', () => {
    const result = validateAccountEdit({ ...card, name: '', closingDay: '40' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors['name']).toMatch(/Dê um nome/);
    expect(!result.ok && result.errors['creditCard.closingDay']).toMatch(/1 a 31/);
  });
});
