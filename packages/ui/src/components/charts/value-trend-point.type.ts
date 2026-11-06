/** One point of the value trend: a moment and a plain number (bytes, units, anything but money). */
export type ValueTrendPoint = {
  /** Stable identity of the point ("2026-11-05T06:00:00.000Z"). */
  key: string;
  /** The short label under the axis ("05/11"). */
  label: string;
  /** The moment written out for the tip and the table ("Ontem às 03:00"). */
  fullLabel: string;
  value: number;
};
