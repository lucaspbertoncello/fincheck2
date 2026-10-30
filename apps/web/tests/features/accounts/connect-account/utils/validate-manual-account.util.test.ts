import { describe, expect, it } from 'vitest';

import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { validateManualAccount } from '#/features/accounts/connect-account/utils/validate-manual-account.util.ts';

const form: ManualAccountForm = {
  type: 'checking',
  name: 'Conta do Inter',
  institutionCode: 'inter',
  institutionName: '',
  initialBalanceCents: 150_000,
  brand: 'visa',
  last4: '',
  closingDay: '',
  dueDay: '',
  limitCents: 0,
};

describe('validateManualAccount', () => {
  it('builds the request of a checking account with its opening balance', () => {
    const result = validateManualAccount(form);

    expect(result).toEqual({
      ok: true,
      body: {
        type: 'checking',
        name: 'Conta do Inter',
        institutionCode: 'inter',
        initialBalanceCents: 150_000,
      },
    });
  });

  it('needs no bank for a wallet, and sends no institution', () => {
    const result = validateManualAccount({ ...form, type: 'wallet', institutionCode: '' });

    expect(result.ok).toBe(true);
    expect(result.ok && 'institutionCode' in result.body).toBe(false);
  });

  it('asks for the card data of a credit card, with the messages in Portuguese', () => {
    const result = validateManualAccount({
      ...form,
      type: 'credit_card',
      name: '',
      institutionCode: '',
    });

    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: 'Dê um nome à conta (até 60 letras)',
        institutionCode: 'Escolha o banco',
        'creditCard.closingDay': 'Dia de fechamento de 1 a 31',
        'creditCard.dueDay': 'Dia de vencimento de 1 a 31',
      },
    });
  });

  it('asks for the name of the bank when it is "Outro"', () => {
    const result = validateManualAccount({ ...form, institutionCode: 'other' });

    expect(result).toMatchObject({
      ok: false,
      errors: { institutionName: 'Diga o nome do banco' },
    });
  });
});
