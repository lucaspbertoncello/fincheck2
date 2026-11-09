import { describe, expect, it } from 'vitest';

import { computeBillState } from '#/modules/bills/domain/bill/compute-bill-state.util.ts';

const base = { amountCents: 45000, paidCents: 0, dueOn: '2026-10-31', today: '2026-10-30' };

describe('computeBillState', () => {
  it('is open when nothing was paid and the day has not passed', () => {
    expect(computeBillState(base)).toBe('open');
  });

  it('is open on the due day itself (overdue starts the day after)', () => {
    expect(computeBillState({ ...base, today: '2026-10-31' })).toBe('open');
    expect(computeBillState({ ...base, today: '2026-11-01' })).toBe('overdue');
  });

  it('is partial when something was paid and it is not late', () => {
    expect(computeBillState({ ...base, paidCents: 15000 })).toBe('partial');
  });

  it('is overdue before partial: a partial payment does not hide the delay', () => {
    expect(computeBillState({ ...base, paidCents: 15000, today: '2026-11-02' })).toBe('overdue');
  });

  it('is settled when paid everything, even after the due day', () => {
    expect(computeBillState({ ...base, paidCents: 45000, today: '2026-12-01' })).toBe('settled');
  });

  it('is settled on the cent, and still partial one cent short', () => {
    expect(computeBillState({ ...base, paidCents: 44999 })).toBe('partial');
    expect(computeBillState({ ...base, paidCents: 45000 })).toBe('settled');
  });

  it('never overdue without a due day', () => {
    expect(computeBillState({ ...base, dueOn: null, today: '2030-01-01' })).toBe('open');
    expect(computeBillState({ ...base, dueOn: null, paidCents: 1, today: '2030-01-01' })).toBe(
      'partial',
    );
  });
});
