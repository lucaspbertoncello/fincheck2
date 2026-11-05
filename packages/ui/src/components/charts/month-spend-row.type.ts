export type MonthSpendRow = {
  day: number;
  /** Cumulative spend of the current month; null after today. */
  current: number | null;
  /** Cumulative spend of the previous month. */
  previous: number;
};
