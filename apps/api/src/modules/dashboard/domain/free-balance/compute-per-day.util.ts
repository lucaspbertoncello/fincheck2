import { Money } from '#/shared/money/money.value-object.ts';

// What the Livre allows per day: the Livre divided by the days left, rounded to the cent with the
// half going up (770.725 is 770.73; -770.725 is -770.72). Integer arithmetic only.
export function computePerDay(free: Money, daysRemaining: number): Money {
  if (!Number.isInteger(daysRemaining) || daysRemaining < 1) {
    throw new RangeError('daysRemaining must be an integer >= 1');
  }

  return Money.fromCents(Math.floor((2 * free.cents + daysRemaining) / (2 * daysRemaining)));
}
