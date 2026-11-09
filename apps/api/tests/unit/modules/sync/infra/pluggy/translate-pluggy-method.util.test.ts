import { describe, expect, it } from 'vitest';

import { translatePluggyMethod } from '#/modules/sync/infra/pluggy/translate-pluggy-method.util.ts';

describe('translatePluggyMethod', () => {
  it.each([
    // [accountType, direction, operationType, paymentMethod, expected]
    ['credit_card', 'debit', 'PIX', 'PIX', 'credit'],
    ['credit_card', 'credit', null, null, 'credit'],
    ['checking', 'debit', 'PIX', null, 'pix'],
    ['checking', 'credit', null, 'PIX', 'pix'],
    ['checking', 'debit', 'pix', null, 'pix'],
    ['checking', 'debit', 'BOLETO', null, 'boleto'],
    ['checking', 'debit', null, 'Boleto', 'boleto'],
    ['checking', 'debit', 'TED', null, 'transfer'],
    ['checking', 'credit', 'DOC', null, 'transfer'],
    ['checking', 'debit', 'TRANSFERENCIA', null, 'transfer'],
    ['savings', 'debit', 'TRANSFER', null, 'transfer'],
    ['checking', 'debit', 'TRANSFERENCIA_MESMA_INSTITUICAO', null, 'transfer'],
    ['checking', 'debit', null, 'TRANSFERÊNCIA', 'transfer'],
    // The operation type wins over the payment method.
    ['checking', 'debit', 'BOLETO', 'PIX', 'boleto'],
    // Nothing recognized: a debit is `debit`, the rest is `other`.
    ['checking', 'debit', null, null, 'debit'],
    ['checking', 'debit', 'COMPRA', 'OUTRO', 'debit'],
    ['checking', 'credit', null, null, 'other'],
    ['checking', 'credit', 'SALARIO', null, 'other'],
    // "TED" has to be a word of its own.
    ['checking', 'credit', 'SALDO_DEPOSITADO', null, 'other'],
  ] as const)(
    '%s %s %s %s is %s',
    (accountType, direction, operationType, paymentMethod, expected) => {
      expect(translatePluggyMethod({ accountType, direction, operationType, paymentMethod })).toBe(
        expected,
      );
    },
  );
});
