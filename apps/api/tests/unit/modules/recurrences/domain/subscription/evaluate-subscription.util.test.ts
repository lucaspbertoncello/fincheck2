import { describe, expect, it } from 'vitest';

import { evaluateSubscription } from '#/modules/recurrences/domain/subscription/evaluate-subscription.util.ts';

type Input = Parameters<typeof evaluateSubscription>[0];

function evaluate(overrides: Partial<Input> = {}) {
  return evaluateSubscription({
    month: '2026-10',
    currentMonth: '2026-10',
    expectedCents: 5590,
    endedOn: null,
    occurrenceStatus: 'expected',
    charges: [],
    ...overrides,
  });
}

const charge = (occurredOn: string, cents: number, id = occurredOn) => ({
  transactionId: id,
  occurredOn,
  cents,
});

describe('evaluateSubscription', () => {
  it('is still to come when nothing was charged yet and the occurrence is expected', () => {
    expect(evaluate()).toEqual({ status: 'upcoming', lastChargeCents: null, alert: null });
  });

  it('is charged when the month has a charge, with no warning at the expected price', () => {
    expect(evaluate({ charges: [charge('2026-09-12', 5590), charge('2026-10-12', 5590)] })).toEqual(
      { status: 'charged', lastChargeCents: 5590, alert: null },
    );
  });

  it('is charged when the occurrence was confirmed, even with no charge listed', () => {
    expect(evaluate({ occurrenceStatus: 'confirmed' })?.status).toBe('charged');
  });

  it('is missed when the occurrence is late, and warns that it did not charge', () => {
    expect(evaluate({ occurrenceStatus: 'late' })).toEqual({
      status: 'missed',
      lastChargeCents: null,
      alert: { kind: 'missed' },
    });
  });

  it('is missed in a past month that has no occurrence and no charge', () => {
    expect(evaluate({ month: '2026-08', occurrenceStatus: null })?.status).toBe('missed');
  });

  it('is still to come in a future month with no occurrence', () => {
    expect(evaluate({ month: '2026-12', occurrenceStatus: null })?.status).toBe('upcoming');
  });

  describe('price changed: more than R$ 0,50 from the expected amount', () => {
    it('warns with the old and the new price', () => {
      expect(evaluate({ charges: [charge('2026-10-12', 5990)] })).toMatchObject({
        status: 'charged',
        alert: { kind: 'price_changed', fromCents: 5590, toCents: 5990 },
      });
    });

    it('does not warn at R$ 0,50 on the dot, and warns a cent beyond (up or down)', () => {
      expect(evaluate({ charges: [charge('2026-10-12', 5640)] })?.alert).toBeNull();
      expect(evaluate({ charges: [charge('2026-10-12', 5540)] })?.alert).toBeNull();
      expect(evaluate({ charges: [charge('2026-10-12', 5641)] })?.alert).toMatchObject({
        kind: 'price_changed',
      });
      expect(evaluate({ charges: [charge('2026-10-12', 5539)] })?.alert).toMatchObject({
        kind: 'price_changed',
      });
    });

    it('reads the last charge, not the first', () => {
      expect(
        evaluate({ charges: [charge('2026-09-12', 5990), charge('2026-10-12', 5590)] })?.alert,
      ).toBeNull();
    });
  });

  describe('ended (paused or deleted)', () => {
    it('has no place in the tab when it did not charge after it ended', () => {
      expect(evaluate({ endedOn: '2026-10-05', charges: [charge('2026-10-03', 5590)] })).toBeNull();
      expect(evaluate({ endedOn: '2026-10-05' })).toBeNull();
    });

    it('warns "cobrou depois de encerrada" with the charge that came after it', () => {
      expect(
        evaluate({
          endedOn: '2026-10-05',
          charges: [charge('2026-10-03', 5590), charge('2026-10-12', 5990, 'late-one')],
        }),
      ).toEqual({
        status: 'charged',
        lastChargeCents: 5990,
        alert: {
          kind: 'charged_after_end',
          amountCents: 5990,
          occurredOn: '2026-10-12',
          transactionId: 'late-one',
        },
      });
    });

    it('does not count a charge on the very day it ended as after it', () => {
      expect(evaluate({ endedOn: '2026-10-12', charges: [charge('2026-10-12', 5590)] })).toBeNull();
    });

    it('only looks at the charges of the month asked', () => {
      expect(evaluate({ endedOn: '2026-08-05', charges: [charge('2026-09-12', 5590)] })).toBeNull();
    });
  });
});
