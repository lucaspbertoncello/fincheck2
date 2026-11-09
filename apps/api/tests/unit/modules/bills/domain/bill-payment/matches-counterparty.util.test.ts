import { describe, expect, it } from 'vitest';

import { matchesCounterparty } from '#/modules/bills/domain/bill-payment/matches-counterparty.util.ts';

const transaction = {
  counterparty: 'RAFAEL SILVA',
  description: 'Pix enviado',
  bankDescription: 'PIX ENVIADO RAFAEL SILVA',
};

describe('matchesCounterparty', () => {
  it('finds the name in the sender, ignoring case and accents', () => {
    expect(matchesCounterparty('Rafael', transaction)).toBe(true);
    expect(matchesCounterparty('rafaél', transaction)).toBe(true);
  });

  it('finds the name in the description of the bank or in the one in use', () => {
    expect(
      matchesCounterparty('Júlia', {
        counterparty: null,
        description: 'Pix para JULIA',
        bankDescription: null,
      }),
    ).toBe(true);
    expect(
      matchesCounterparty('Júlia', {
        counterparty: null,
        description: 'Pix',
        bankDescription: 'PIX JULIA M',
      }),
    ).toBe(true);
  });

  it('does not match another person', () => {
    expect(matchesCounterparty('Bia', transaction)).toBe(false);
  });

  it('matches whole words only: Ana is not in BANANA, but is in PIX ANA SILVA or PIX-ANA.', () => {
    const text = (bankDescription: string) => ({
      counterparty: null,
      description: 'Pix',
      bankDescription,
    });

    expect(matchesCounterparty('Ana', text('PIX RECEBIDO BANANA LTDA'))).toBe(false);
    expect(matchesCounterparty('Ana', text('PIX RECEBIDO ANA SILVA'))).toBe(true);
    expect(matchesCounterparty('Ana', text('PIX-ANA.'))).toBe(true);
    expect(matchesCounterparty('Ana Paula', text('PIX ANA  PAULA SOUZA'))).toBe(true);
  });

  it('never matches without a name or with a blank one', () => {
    expect(matchesCounterparty(null, transaction)).toBe(false);
    expect(matchesCounterparty('   ', transaction)).toBe(false);
  });
});
