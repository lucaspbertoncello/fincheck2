import { describe, expect, it } from 'vitest';

import { computeOccurrenceState } from '#/modules/recurrences/domain/occurrence/compute-occurrence-state.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

type Input = Parameters<typeof computeOccurrenceState>[0];

function stateOf(overrides: Partial<Input> = {}) {
  return computeOccurrenceState({
    expectedCents: 85000,
    paymentCents: [],
    settled: false,
    skipped: false,
    windowEndOn: BusinessDate.of('2026-10-31'),
    today: BusinessDate.of('2026-10-22'),
    differenceDecision: null,
    amountMode: 'fixed',
    ...overrides,
  });
}

describe('computeOccurrenceState', () => {
  it('is expected while nothing came and the window has not ended', () => {
    expect(stateOf()).toEqual({
      status: 'expected',
      receivedCents: 0,
      remainingCents: 85000,
      difference: null,
      needsAttention: false,
    });
  });

  it('is partial when part came ("425,00 de 850,00")', () => {
    expect(stateOf({ paymentCents: [42500] })).toMatchObject({
      status: 'partial',
      receivedCents: 42500,
      remainingCents: 42500,
      needsAttention: false,
    });
  });

  it('confirms when the payments add up to the expected amount, with no difference', () => {
    expect(stateOf({ paymentCents: [42500, 42500] })).toEqual({
      status: 'confirmed',
      receivedCents: 85000,
      remainingCents: 0,
      difference: null,
      needsAttention: false,
    });
  });

  it('confirms with a difference when more came than expected (positive) and asks for an answer', () => {
    expect(stateOf({ paymentCents: [90000] })).toEqual({
      status: 'confirmed',
      receivedCents: 90000,
      remainingCents: 0,
      difference: { amountCents: 5000, decision: null },
      needsAttention: true,
    });
  });

  describe('the 15% tolerance of a single payment (R5)', () => {
    it('confirms one payment of exactly 85% of the expected amount, with a negative difference', () => {
      expect(stateOf({ paymentCents: [72250] })).toMatchObject({
        status: 'confirmed',
        difference: { amountCents: -12750, decision: null },
        needsAttention: true,
      });
    });

    it('does not confirm one payment a cent below 85%', () => {
      expect(stateOf({ paymentCents: [72249] })).toMatchObject({
        status: 'partial',
        difference: null,
      });
    });

    it('does not confirm two payments that add up to 85%: the tolerance is for one payment only', () => {
      expect(stateOf({ paymentCents: [36125, 36125] })).toMatchObject({
        status: 'partial',
        receivedCents: 72250,
        remainingCents: 12750,
      });
    });

    it('is exact in cents with an amount that has no exact 85% (R$ 21,90: 18,62 is short, 18,63 is enough)', () => {
      expect(stateOf({ expectedCents: 2190, paymentCents: [1861] }).status).toBe('partial');
      expect(stateOf({ expectedCents: 2190, paymentCents: [1862] }).status).toBe('confirmed');
    });
  });

  describe('late (R4)', () => {
    it('is not late on the last day of the window', () => {
      expect(stateOf({ today: BusinessDate.of('2026-10-31') }).status).toBe('expected');
    });

    it('is late the day after the window ends, and asks for an answer', () => {
      expect(stateOf({ today: BusinessDate.of('2026-11-01') })).toMatchObject({
        status: 'late',
        remainingCents: 85000,
        needsAttention: true,
      });
    });

    it('is late even with a partial payment, which wins over partial', () => {
      expect(
        stateOf({ today: BusinessDate.of('2026-11-01'), paymentCents: [42500] }),
      ).toMatchObject({ status: 'late', receivedCents: 42500, remainingCents: 42500 });
    });

    it('is confirmed, not late, when it was paid in full after the window', () => {
      expect(stateOf({ today: BusinessDate.of('2026-11-05'), paymentCents: [85000] }).status).toBe(
        'confirmed',
      );
    });
  });

  describe('marks', () => {
    it('is skipped when dismissed, whatever else holds, and asks for nothing', () => {
      expect(
        stateOf({ skipped: true, paymentCents: [10000], today: BusinessDate.of('2026-12-01') }),
      ).toMatchObject({ status: 'skipped', remainingCents: 0, needsAttention: false });
    });

    it('is confirmed when marked by hand, with no difference and nothing to receive', () => {
      expect(stateOf({ settled: true })).toEqual({
        status: 'confirmed',
        receivedCents: 0,
        remainingCents: 0,
        difference: null,
        needsAttention: false,
      });
    });

    it('has no difference when marked by hand over a payment of another value', () => {
      expect(stateOf({ settled: true, paymentCents: [90000] }).difference).toBeNull();
    });

    it('is not late when marked by hand after the window', () => {
      expect(stateOf({ settled: true, today: BusinessDate.of('2027-01-01') }).status).toBe(
        'confirmed',
      );
    });
  });

  describe('the answer to a difference (BR-REC-009)', () => {
    it('carries the decision and stops asking once it is "kept"', () => {
      expect(stateOf({ paymentCents: [90000], differenceDecision: 'kept' })).toMatchObject({
        difference: { amountCents: 5000, decision: 'kept' },
        needsAttention: false,
      });
    });

    it('carries the decision and stops asking once it is "updated"', () => {
      expect(stateOf({ paymentCents: [90000], differenceDecision: 'updated' })).toMatchObject({
        difference: { amountCents: 5000, decision: 'updated' },
        needsAttention: false,
      });
    });

    it('answers by itself when the source follows the last amount received (BR-REC-014)', () => {
      expect(stateOf({ paymentCents: [90000], amountMode: 'last_received' })).toMatchObject({
        difference: { amountCents: 5000, decision: 'updated' },
        needsAttention: false,
      });
    });
  });

  it('works in integer cents: three payments of 33,33 against 100,00 stay partial with 0,01 left', () => {
    expect(stateOf({ expectedCents: 10000, paymentCents: [3333, 3333, 3333] })).toMatchObject({
      status: 'partial',
      receivedCents: 9999,
      remainingCents: 1,
    });
  });
});
