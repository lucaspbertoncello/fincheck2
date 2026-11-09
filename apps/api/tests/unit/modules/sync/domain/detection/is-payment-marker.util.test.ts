import { describe, expect, it } from 'vitest';

import { isPaymentMarker } from '#/modules/sync/domain/detection/is-payment-marker.util.ts';

describe('isPaymentMarker', () => {
  it.each([
    'PAGAMENTO RECEBIDO',
    'Pagamento de fatura',
    'pgto fatura',
    'PAGTO FATURA',
    'Pagto recebido',
    'PAG FATURA',
    'Pagamento recebido - obrigado',
    'Pagamento em dia',
  ])('"%s" says the invoice was paid', (description) => {
    expect(isPaymentMarker(description)).toBe(true);
  });

  it.each(['ESTORNO AMAZON', 'PGTOS DIVERSOS', 'PAGAMENTOS', 'PAGFATURA', 'Compra no débito', ''])(
    '"%s" does not',
    (description) => {
      expect(isPaymentMarker(description)).toBe(false);
    },
  );
});
