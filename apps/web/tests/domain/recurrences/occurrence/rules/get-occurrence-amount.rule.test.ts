import { describe, expect, it } from 'vitest';

import { getOccurrenceAmount } from '#/domain/recurrences/occurrence/rules/get-occurrence-amount.rule.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

describe('getOccurrenceAmount', () => {
  it('shows the expected amount alone while nothing came in (pending and late)', () => {
    expect(getOccurrenceAmount(createTestOccurrence())).toEqual({ amountCents: 10_990 });
    expect(getOccurrenceAmount(createTestOccurrence({ status: 'late' }))).toEqual({
      amountCents: 10_990,
    });
  });

  it('shows the expected amount alone on a dismissed month, even with a payment left in it', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({ status: 'skipped', receivedCents: 4_000, remainingCents: 0 }),
      ),
    ).toEqual({ amountCents: 10_990 });
  });

  it('repeats the expected amount as the reference on one marked as done by hand', () => {
    expect(getOccurrenceAmount(createTestOccurrence({ status: 'confirmed' }))).toEqual({
      amountCents: 10_990,
      expectedCents: 10_990,
    });
  });

  it('shows what came in with the expected amount and what is missing on a partial one', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'partial',
          receivedCents: 4_000,
          expectedAmountCents: 8_000,
          remainingCents: 4_000,
        }),
      ),
    ).toEqual({ amountCents: 4_000, expectedCents: 8_000, remainingCents: 4_000 });
  });

  it('keeps the expected amount on a confirmed one, with nothing missing', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'confirmed',
          receivedCents: 260_000,
          expectedAmountCents: 260_000,
        }),
      ),
    ).toEqual({ amountCents: 260_000, expectedCents: 260_000 });
  });

  it('shows what is missing on a late one that already got a payment', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'late',
          receivedCents: 4_000,
          expectedAmountCents: 8_000,
          remainingCents: 4_000,
        }),
      ),
    ).toEqual({ amountCents: 4_000, expectedCents: 8_000, remainingCents: 4_000 });
  });

  it('shows what came in above the expected amount, on a confirmed and on a partial one', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'confirmed',
          receivedCents: 290_000,
          expectedAmountCents: 260_000,
        }),
      ),
    ).toEqual({ amountCents: 290_000, expectedCents: 260_000, excessCents: 30_000 });
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'partial',
          receivedCents: 130_000,
          expectedAmountCents: 100_000,
          remainingCents: 0,
        }),
      ),
    ).toEqual({ amountCents: 130_000, expectedCents: 100_000, excessCents: 30_000 });
  });

  it('shows no excess and nothing missing on a different amount below the expected one', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'confirmed',
          receivedCents: 8_790,
          expectedAmountCents: 10_990,
          remainingCents: 0,
          difference: { amountCents: -2_200, decision: null },
        }),
      ),
    ).toEqual({ amountCents: 8_790, expectedCents: 10_990 });
  });

  it('shows the excess of a late one that came in above the expected amount, with nothing missing', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'late',
          receivedCents: 13_000,
          expectedAmountCents: 10_990,
          remainingCents: 0,
        }),
      ),
    ).toEqual({ amountCents: 13_000, expectedCents: 10_990, excessCents: 2_010 });
  });
});
