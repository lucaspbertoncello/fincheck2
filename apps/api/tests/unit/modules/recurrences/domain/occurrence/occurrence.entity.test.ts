import { describe, expect, it } from 'vitest';

import { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import { OccurrenceAlreadySettledError } from '#/modules/recurrences/domain/occurrence/occurrence-already-settled.error.ts';
import { OccurrenceAlreadySkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-already-skipped.error.ts';
import { OccurrenceNoDifferenceError } from '#/modules/recurrences/domain/occurrence/occurrence-no-difference.error.ts';
import { OccurrenceNotSettledError } from '#/modules/recurrences/domain/occurrence/occurrence-not-settled.error.ts';
import { OccurrenceNotSkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-not-skipped.error.ts';
import { OccurrenceSkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-skipped.error.ts';
import { OccurrencePaymentNotFoundError } from '#/modules/recurrences/domain/occurrence-payment/occurrence-payment-not-found.error.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-10-22T15:00:00.000Z';
const LATER = '2026-10-23T15:00:00.000Z';

function build(): Occurrence {
  return Occurrence.open(
    {
      recurrenceId: 'r1',
      month: Month.of('2026-10'),
      expectedAmount: Money.fromCents(85000),
      window: {
        expectedOn: null,
        windowStartOn: BusinessDate.of('2026-10-01'),
        windowEndOn: BusinessDate.of('2026-10-31'),
      },
    },
    NOW,
  );
}

describe('Occurrence', () => {
  it('is born expected and untouched, with the amount and the window it was given (BR-REC-005)', () => {
    const occurrence = build();

    expect(occurrence).toMatchObject({
      recurrenceId: 'r1',
      settledAt: null,
      skippedAt: null,
      differenceDecision: null,
      payments: [],
    });
    expect(occurrence.expectedAmount.cents).toBe(85000);
    expect(occurrence.isUntouched()).toBe(true);
    expect(occurrence.isHistory()).toBe(false);
  });

  describe('link and unlink', () => {
    it('ties a transaction, keeping what it was worth, and stops being untouched', () => {
      const occurrence = build();

      const payment = occurrence.link(
        { transactionId: 't1', amount: Money.fromCents(42500), linkedBy: 'user' },
        LATER,
      );

      expect(payment).toMatchObject({ transactionId: 't1', linkedBy: 'user', createdAt: LATER });
      expect(payment.amount.cents).toBe(42500);
      expect(occurrence.payments).toHaveLength(1);
      expect(occurrence.isHistory()).toBe(true);
    });

    it('asks the difference again: a new link clears the answer', () => {
      const occurrence = build();
      occurrence.differenceDecision = 'kept';

      occurrence.link({ transactionId: 't1', amount: Money.fromCents(1), linkedBy: 'auto' }, LATER);

      expect(occurrence.differenceDecision).toBeNull();
    });

    it('takes no payment once skipped', () => {
      const occurrence = build();
      occurrence.skip(false, NOW);

      expect(() =>
        occurrence.link(
          { transactionId: 't1', amount: Money.fromCents(1), linkedBy: 'user' },
          LATER,
        ),
      ).toThrow(OccurrenceSkippedError);
    });

    it('unlinks one payment, keeps the others and clears the answer', () => {
      const occurrence = build();
      const first = occurrence.link(
        { transactionId: 't1', amount: Money.fromCents(100), linkedBy: 'user' },
        NOW,
      );
      occurrence.link({ transactionId: 't2', amount: Money.fromCents(200), linkedBy: 'user' }, NOW);
      occurrence.differenceDecision = 'updated';

      occurrence.unlink(first.id, LATER);

      expect(occurrence.payments.map((payment) => payment.transactionId)).toEqual(['t2']);
      expect(occurrence.differenceDecision).toBeNull();
    });

    it('refuses to unlink a payment that is not in it', () => {
      expect(() => build().unlink('nope', LATER)).toThrow(OccurrencePaymentNotFoundError);
    });
  });

  describe('countedPayments', () => {
    it('counts each payment for the least of what it was and what the transaction is worth now', () => {
      const occurrence = build();
      occurrence.link(
        { transactionId: 't1', amount: Money.fromCents(42500), linkedBy: 'user' },
        NOW,
      );
      occurrence.link(
        { transactionId: 't2', amount: Money.fromCents(42500), linkedBy: 'user' },
        NOW,
      );

      const counted = occurrence.countedPayments((id) =>
        id === 't1'
          ? { cents: 30000, occurredOn: BusinessDate.of('2026-10-05'), description: 'Salário' }
          : {
              cents: 99999,
              occurredOn: BusinessDate.of('2026-10-03'),
              description: 'Adiantamento',
            },
      );

      // Oldest transaction first; a transaction worth less now counts for less, one worth more
      // never counts for more than what was linked.
      expect(
        counted.map((item) => [item.payment.transactionId, item.cents, item.description]),
      ).toEqual([
        ['t2', 42500, 'Adiantamento'],
        ['t1', 30000, 'Salário'],
      ]);
    });

    it('leaves out the payment of a transaction that does not count', () => {
      const occurrence = build();
      occurrence.link(
        { transactionId: 't1', amount: Money.fromCents(42500), linkedBy: 'user' },
        NOW,
      );

      expect(occurrence.countedPayments(() => null)).toEqual([]);
    });
  });

  describe('settle and unsettle (BR-REC-007)', () => {
    it('marks and unmarks by hand', () => {
      const occurrence = build();

      occurrence.settle(false, LATER);
      expect(occurrence.settledAt).toBe(LATER);
      expect(occurrence.isHistory()).toBe(true);

      occurrence.unsettle(LATER);
      expect(occurrence.settledAt).toBeNull();
    });

    it('refuses to settle what is skipped, settled or already confirmed by its payments', () => {
      const skipped = build();
      skipped.skip(false, NOW);
      const settled = build();
      settled.settle(false, NOW);

      expect(() => skipped.settle(false, LATER)).toThrow(OccurrenceSkippedError);
      expect(() => settled.settle(false, LATER)).toThrow(OccurrenceAlreadySettledError);
      expect(() => build().settle(true, LATER)).toThrow(OccurrenceAlreadySettledError);
    });

    it('refuses to unsettle what has no mark', () => {
      expect(() => build().unsettle(LATER)).toThrow(OccurrenceNotSettledError);
    });
  });

  describe('skip and unskip (Q7)', () => {
    it('skips and unskips', () => {
      const occurrence = build();

      occurrence.skip(false, LATER);
      expect(occurrence.skippedAt).toBe(LATER);

      occurrence.unskip(LATER);
      expect(occurrence.skippedAt).toBeNull();
    });

    it('refuses to skip twice, to skip a confirmed one and to unskip what is not skipped', () => {
      const occurrence = build();
      occurrence.skip(false, NOW);

      expect(() => occurrence.skip(false, LATER)).toThrow(OccurrenceAlreadySkippedError);
      expect(() => build().skip(true, LATER)).toThrow(OccurrenceAlreadySettledError);
      expect(() => build().unskip(LATER)).toThrow(OccurrenceNotSkippedError);
    });
  });

  describe('amounts and differences', () => {
    it('changes the amount of the month and asks the difference again', () => {
      const occurrence = build();
      occurrence.differenceDecision = 'kept';

      occurrence.changeExpectedAmount(Money.fromCents(90000), LATER);

      expect(occurrence.expectedAmount.cents).toBe(90000);
      expect(occurrence.differenceDecision).toBeNull();
      expect(() => occurrence.changeExpectedAmount(Money.zero(), LATER)).toThrow(RangeError);
    });

    it('records the answer to a difference, the last one holding, and refuses without a difference', () => {
      const occurrence = build();

      expect(() => occurrence.decideDifference('kept', false, LATER)).toThrow(
        OccurrenceNoDifferenceError,
      );

      occurrence.decideDifference('kept', true, LATER);
      occurrence.decideDifference('updated', true, LATER);
      expect(occurrence.differenceDecision).toBe('updated');
    });

    it('follows the recurrence when untouched: reschedules and retargets without clearing anything', () => {
      const occurrence = build();

      occurrence.reschedule(
        {
          expectedOn: BusinessDate.of('2026-10-15'),
          windowStartOn: BusinessDate.of('2026-10-12'),
          windowEndOn: BusinessDate.of('2026-10-18'),
        },
        LATER,
      );
      occurrence.retarget(Money.fromCents(99000), LATER);

      expect(occurrence.expectedOn?.value).toBe('2026-10-15');
      expect(occurrence.windowEndOn.value).toBe('2026-10-18');
      expect(occurrence.expectedAmount.cents).toBe(99000);
    });
  });
});
