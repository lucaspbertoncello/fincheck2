import { describe, expect, it } from 'vitest';

import { resolveRowStatus } from '#/domain/bills/bill/rules/resolve-row-status.rule.ts';

const open = {
  state: 'upcoming',
  presumedPaidCents: 0,
  presumedTransactionId: null,
  paidCents: 0,
} as const;

describe('resolveRowStatus', () => {
  it('maps the state of the agenda to the row', () => {
    expect(resolveRowStatus(open)).toBe('open');
    expect(resolveRowStatus({ ...open, state: 'overdue' })).toBe('late');
    expect(resolveRowStatus({ ...open, state: 'partial', paidCents: 100 })).toBe('partial');
    expect(resolveRowStatus({ ...open, state: 'settled' })).toBe('settled');
  });

  it('shows "pago, falta vincular" when a payment was detected and not linked (R1)', () => {
    expect(
      resolveRowStatus({
        ...open,
        state: 'overdue',
        presumedPaidCents: 18000,
        presumedTransactionId: 'tx-1',
      }),
    ).toBe('paid-unlinked');
  });

  it('does not call it partial when nothing was paid', () => {
    expect(resolveRowStatus({ ...open, state: 'partial' })).toBe('open');
  });
});
