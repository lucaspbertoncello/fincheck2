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
