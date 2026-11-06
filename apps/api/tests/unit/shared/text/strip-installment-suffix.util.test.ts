import { describe, expect, it } from 'vitest';

import { stripInstallmentSuffix } from '#/shared/text/strip-installment-suffix.util.ts';

describe('stripInstallmentSuffix', () => {
  it.each([
    ['AMAZON 03/10', 'AMAZON '],
    ['Amazon Marketplace 03/10', 'Amazon Marketplace '],
    ['03/10 AMAZON', ' AMAZON'],
    ['LOJA X 1/2', 'LOJA X '],
    ['LOJA X 12/12', 'LOJA X '],
  ])('removes the n/N of %j', (input, expected) => {
    expect(stripInstallmentSuffix(input)).toBe(expected);
  });

  it.each([
    ['MERCADO 12/05'], // n > N reads as a date
    ['PAGAMENTO 06/11/2026'], // a full date
    ['BOLETO 1/1'], // a single payment is not an installment
    ['PLANO 100/200'], // not two digits each
    ['NETFLIX'],
  ])('leaves %j alone', (input) => {
    expect(stripInstallmentSuffix(input)).toBe(input);
  });
});
