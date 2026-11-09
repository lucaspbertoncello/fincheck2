import { describe, expect, it } from 'vitest';

import { matchInstitutionCode } from '#/modules/sync/infra/pluggy/match-institution-code.util.ts';

describe('matchInstitutionCode', () => {
  it.each([
    ['Nubank', 'nubank'],
    ['NUBANK', 'nubank'],
    ['Nu Pagamentos - Nubank', 'nubank'],
    ['Nu Pagamentos S.A. - Instituição de Pagamento', 'nubank'],
    ['Nu Financeira S.A.', 'nubank'],
    ['Banco C6 S.A.', 'c6'],
    ['Itaú Unibanco S.A.', 'itau'],
    ['Banco Bradesco S.A.', 'bradesco'],
    ['MeuPluggy', 'other'],
    ['Itaú', 'itau'],
    ['ITAU', 'itau'],
    ['Itau Cartoes', 'itau'],
    ['Itaú Personnalité', 'itau'],
    ['Banco do Brasil', 'banco-do-brasil'],
    ['BANCO DO BRASIL S.A.', 'banco-do-brasil'],
    ['Bradesco', 'bradesco'],
    ['Banco Inter', 'inter'],
    ['Santander', 'santander'],
    ['Caixa Econômica Federal', 'caixa'],
    ['C6 Bank', 'c6'],
    ['PicPay', 'picpay'],
    ['Mercado Pago', 'mercado-pago'],
    ['International Bank', 'other'],
    ['Banco Original', 'other'],
    ['', 'other'],
  ])('%s is %s', (name, code) => {
    expect(matchInstitutionCode(name)).toBe(code);
  });
});
