import { describe, expect, it } from 'vitest';

import { deriveMeuPluggyInstitution } from '#/modules/sync/infra/pluggy/derive-meu-pluggy-institution.util.ts';
import {
  buildTestBankAccount,
  buildTestBankCard,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

describe('deriveMeuPluggyInstitution', () => {
  it('reads the bank from the name of the checking account', () => {
    expect(
      deriveMeuPluggyInstitution([
        buildTestBankCard({ name: 'Nu Pagamentos S.A.' }),
        buildTestBankAccount({ name: 'Banco C6 S.A.' }),
      ]),
    ).toEqual({ name: 'Banco C6 S.A.', code: 'c6' });
  });

  it('reads it from a savings account too', () => {
    expect(
      deriveMeuPluggyInstitution([buildTestBankAccount({ type: 'savings', name: 'Nubank' })]),
    ).toEqual({ name: 'Nubank', code: 'nubank' });
  });

  it('never reads it from a card', () => {
    expect(deriveMeuPluggyInstitution([buildTestBankCard({ name: 'Nubank' })])).toBeNull();
  });

  it('is null with no accounts or with a name that matches no bank', () => {
    expect(deriveMeuPluggyInstitution([])).toBeNull();
    expect(
      deriveMeuPluggyInstitution([buildTestBankAccount({ name: 'Conta Corrente' })]),
    ).toBeNull();
  });
});
