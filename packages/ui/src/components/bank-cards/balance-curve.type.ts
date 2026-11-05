export type BalanceCurve = {
  /** SVG path of the line, in a 100 × 48 box. */
  line: string;
  /** The same path closed down to the base, for the soft area under the line. */
  area: string;
  /** Vertical position of the last point, 0 (top) to 100 (bottom), in percent. */
  endY: number;
};
