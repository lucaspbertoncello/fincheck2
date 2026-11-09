import { describe, expect, it } from 'vitest';

import { findPresumedBillPayment } from '#/modules/bills/domain/bill-payment/find-presumed-bill-payment.util.ts';
import { pickPresumedBillOwners } from '#/modules/bills/domain/bill-payment/pick-presumed-bill-owners.util.ts';

const candidate = (
  overrides: Partial<Parameters<typeof findPresumedBillPayment>[0]['candidates'][number]> = {},
) => ({
  id: 't1',
  accountId: 'a',
  amountCents: -30000,
  occurredOn: '2026-10-20',
  description: 'PIX ENVIADO',
  bankDescription: null,
  counterparty: null,
  ...overrides,
});

const find = (
  candidates: ReturnType<typeof candidate>[],
  overrides: Partial<Parameters<typeof findPresumedBillPayment>[0]> = {},
) =>
  findPresumedBillPayment({
    counterparty: null,
    remainingCents: 30000,
    dueOn: '2026-10-31',
    createdAt: '2026-10-10T15:00:00.000Z',
    candidates,
    ...overrides,
  });

describe('findPresumedBillPayment', () => {
  it('is the only transaction of the exact value in the window', () => {
    expect(find([candidate()])?.id).toBe('t1');
  });

  it('takes a value up to R$ 1,00 apart, not more', () => {
    expect(find([candidate({ amountCents: -30100 })])).not.toBeNull();
    expect(find([candidate({ amountCents: -29900 })])).not.toBeNull();
    expect(find([candidate({ amountCents: -30101 })])).toBeNull();
    expect(find([candidate({ amountCents: -29899 })])).toBeNull();
  });

  it('takes the credit of a bill to receive by its absolute value', () => {
    expect(find([candidate({ amountCents: 30000 })])?.id).toBe('t1');
  });

  it('looks between the day the bill was created (in São Paulo) and five days after the due day, inclusive', () => {
    // Created at 02:00 UTC on the 10th: still the 9th in São Paulo.
    const created = '2026-10-10T02:00:00.000Z';
    expect(find([candidate({ occurredOn: '2026-10-09' })], { createdAt: created })).not.toBeNull();
    expect(find([candidate({ occurredOn: '2026-10-08' })], { createdAt: created })).toBeNull();
    expect(find([candidate({ occurredOn: '2026-11-05' })])).not.toBeNull();
    expect(find([candidate({ occurredOn: '2026-11-06' })])).toBeNull();
  });

  it('counts the five days across the end of a month and a leap day', () => {
    expect(
      find([candidate({ occurredOn: '2028-03-05' })], {
        dueOn: '2028-02-29',
        createdAt: '2028-02-01T15:00:00.000Z',
      }),
    ).not.toBeNull();
    expect(
      find([candidate({ occurredOn: '2028-03-06' })], {
        dueOn: '2028-02-29',
        createdAt: '2028-02-01T15:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('asks for the name of the person, as whole words, when the bill has one', () => {
    const rafa = candidate({ description: 'PIX RAFA SILVA' });

    expect(find([rafa], { counterparty: 'Rafa' })?.id).toBe('t1');
    expect(find([candidate({ description: 'PIX ENVIADO' })], { counterparty: 'Rafa' })).toBeNull();
    expect(find([candidate({ description: 'PIX BANANA' })], { counterparty: 'Ana' })).toBeNull();
    expect(find([candidate({ counterparty: 'RAFA S' })], { counterparty: 'rafa' })?.id).toBe('t1');
  });

  it('is only a suggestion, so nothing is presumed, when more than one fits', () => {
    expect(find([candidate(), candidate({ id: 't2', amountCents: -30050 })])).toBeNull();
  });

  it('is nothing with no candidate', () => {
    expect(find([])).toBeNull();
  });
});

describe('pickPresumedBillOwners', () => {
  const claim = (
    billId: string,
    transactionId: string,
    dueOn: string,
    createdAt = '2026-10-01T00:00:00.000Z',
  ) => ({
    billId,
    transactionId,
    dueOn,
    createdAt,
  });

  it('gives each transaction to the bill that falls due first, then the oldest, then by id', () => {
    const owners = pickPresumedBillOwners([
      claim('c', 't1', '2026-10-30'),
      claim('a', 't1', '2026-10-20'),
      claim('x', 't2', '2026-10-25', '2026-10-05T00:00:00.000Z'),
      claim('y', 't2', '2026-10-25', '2026-10-04T00:00:00.000Z'),
      claim('m', 't3', '2026-10-25'),
      claim('k', 't3', '2026-10-25'),
    ]);

    expect([...owners].toSorted()).toEqual(['a', 'k', 'y']);
  });

  it('is empty with no claim', () => {
    expect(pickPresumedBillOwners([]).size).toBe(0);
  });
});
