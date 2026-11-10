import { describe, expect, it } from 'vitest';

import { ApiError } from '#/shared/api/api.error.ts';
import { describeInstallmentPlanError } from '#/shared/utils/transactions/describe-installment-plan-error.util.ts';

function planError(code: string, details?: Record<string, unknown>) {
  return new ApiError(422, code, 'Mensagem da API', details);
}

describe('describeInstallmentPlanError', () => {
  it('uses our words for the plan of the bank', () => {
    expect(describeInstallmentPlanError(planError('INSTALLMENT_PLAN_NOT_MANUAL'))).toMatch(
      /do banco não se edita/,
    );
  });

  it('writes the month of a paid invoice by name, never as 2026-12', () => {
    const text = describeInstallmentPlanError(
      planError('INSTALLMENT_INVOICE_PAID', { invoiceMonth: '2026-12' }),
    );

    expect(text).toBe(
      'A fatura de dezembro de 2026 já tem pagamento registrado. Desfaça o pagamento para mudar o valor, a quantidade ou o mês das parcelas.',
    );
    expect(text).not.toContain('2026-12');
    expect(describeInstallmentPlanError(planError('INSTALLMENT_INVOICE_PAID'))).toMatch(
      /^Uma das faturas já tem pagamento/,
    );
  });

  it.each([
    ['INSTALLMENT_PARCEL_SPLIT', 'A parcela 3 está dividida. Desfaça a divisão'],
    [
      'INSTALLMENT_PARCEL_LINKED',
      'A parcela 3 está ligada a uma conta ou a uma recorrência. Desfaça',
    ],
    ['INSTALLMENT_PARCEL_FROM_BANK', 'A parcela 3 veio do banco'],
  ])('names the parcel of %s', (code, start) => {
    expect(describeInstallmentPlanError(planError(code, { number: 3 }))).toContain(start);
    expect(describeInstallmentPlanError(planError(code))).toMatch(/^Uma parcela /);
  });

  it('tells an archived card to be unarchived', () => {
    expect(describeInstallmentPlanError(planError('TRANSACTION_ACCOUNT_ARCHIVED'))).toMatch(
      /Desarquive o cartão/,
    );
  });

  it('uses the transaction words for a code they know, and the API message for any other 422', () => {
    expect(describeInstallmentPlanError(planError('TRANSACTION_CATEGORY_ARCHIVED'))).toBe(
      'Essa categoria está arquivada.',
    );
    expect(describeInstallmentPlanError(planError('SOMETHING_NEW'))).toBe('Mensagem da API');
  });

  it('falls back to the transaction words for the network and the unknown', () => {
    expect(describeInstallmentPlanError(new ApiError(0, 'NETWORK_ERROR', 'x'))).toMatch(
      /Sem resposta/,
    );
    expect(describeInstallmentPlanError(new Error('boom'))).toBe('Não deu certo. Tente de novo.');
  });
});
