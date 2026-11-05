/** One bar of the monthly bars: a month and its total in integer cents. */
export type MonthBar = {
  /** `YYYY-MM`. */
  key: string;
  /** The label under the bar ("nov"). */
  label: string;
  /** The month written out for the tip and the table ("novembro de 2025"). */
  fullLabel: string;
  cents: number;
  /** A second line for the tip and the table ("12 transações"). */
  detail?: string;
};
