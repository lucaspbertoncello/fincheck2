/** One transaction linked to an occurrence, as a line under the open row. */
export type RecurrenceTransaction = {
  id: string;
  /** Short day, "07/10" (with the year, "07/10/2025", when it is not this year's). */
  dateLabel: string;
  description: string;
  /** Integer cents, positive: the flow of the row gives the sign. */
  amountCents: number;
};
