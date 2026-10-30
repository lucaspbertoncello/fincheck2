import { sumCents } from '#/components/transactions/split/sum-cents.util.ts';

export type SplitStatus = 'matches' | 'short' | 'over';

export type SplitCheck = {
  sumCents: number;
  /** Total minus the sum: positive when parts are short, negative when they pass the total. */
  differenceCents: number;
  status: SplitStatus;
  /** Indexes of parts with no amount (zero or negative). */
  emptyPartIndexes: number[];
  /** Two or more parts, each with an amount, adding up to a positive total exactly. */
  valid: boolean;
};

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
