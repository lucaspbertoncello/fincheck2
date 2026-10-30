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
    expect(validateAccountEdit(card, false)).toEqual({
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

  it('does not send the bank when it comes from the Pluggy, and does not ask for it', () => {
    const result = validateAccountEdit(
      { ...card, type: 'checking', institutionCode: '', closingDay: '', dueDay: '' },
      true,
    );

    expect(result).toEqual({ ok: true, body: { name: 'Roxinho' } });
  });

  it('keeps the same messages as the creation when a field is wrong', () => {
    const result = validateAccountEdit({ ...card, name: '', closingDay: '40' }, false);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors['name']).toMatch(/Dê um nome/);
    expect(!result.ok && result.errors['creditCard.closingDay']).toMatch(/1 a 31/);
  });
});
