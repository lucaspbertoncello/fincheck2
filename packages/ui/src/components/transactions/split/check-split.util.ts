import type { SplitCheck, SplitStatus } from '#/components/transactions/split/split-check.type.ts';
import { sumCents } from '#/components/transactions/split/sum-cents.util.ts';

/** Checks that the parts of a split add up to the total, to the cent (BR-TRX-003). */
export function checkSplit(totalCents: number, partsCents: readonly number[]): SplitCheck {
  const sum = sumCents(partsCents);
  const differenceCents = totalCents - sum;
  const status: SplitStatus =
    differenceCents === 0 ? 'matches' : differenceCents > 0 ? 'short' : 'over';
  const emptyPartIndexes = partsCents.flatMap((amount, index) => (amount > 0 ? [] : [index]));

  return {
    sumCents: sum,
    differenceCents,
    status,
    emptyPartIndexes,
    valid:
      totalCents > 0 &&
      partsCents.length >= 2 &&
      status === 'matches' &&
      emptyPartIndexes.length === 0 &&
      partsCents.every(Number.isInteger),
  };
}
