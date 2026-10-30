import { describe, expect, it } from 'vitest';

import { resolvePaymentTarget } from '#/domain/bills/bill/rules/resolve-payment-target.rule.ts';

const empty = {
  billId: null,
  occurrenceId: null,
  recurrenceId: null,
  accountId: null,
  month: null,
};

describe('resolvePaymentTarget', () => {
  it('picks the owner route from the source', () => {
    expect(resolvePaymentTarget({ source: { ...empty, type: 'bill', billId: 'b1' } })).toEqual({
      kind: 'bill',
      billId: 'b1',
    });
    expect(
      resolvePaymentTarget({
        source: { ...empty, type: 'invoice', accountId: 'a1', month: '2026-10' },
      }),
    ).toEqual({ kind: 'invoice', accountId: 'a1', month: '2026-10' });
    expect(
      resolvePaymentTarget({ source: { ...empty, type: 'occurrence', occurrenceId: 'o1' } }),
    ).toEqual({ kind: 'occurrence', occurrenceId: 'o1' });
  });

  it('gives nothing when the source lacks the fields of its type', () => {
    expect(resolvePaymentTarget({ source: { ...empty, type: 'invoice', accountId: 'a1' } })).toBe(
      null,
    );
  });
});
