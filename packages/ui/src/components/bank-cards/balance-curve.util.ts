export type BalanceCurve = {
  /** SVG path of the line, in a 100 × 48 box. */
  line: string;
  /** The same path closed down to the base, for the soft area under the line. */
  area: string;
  /** Vertical position of the last point, 0 (top) to 100 (bottom), in percent. */
  endY: number;
};

const WIDTH = 100;
const HEIGHT = 48;
const PAD = 4;

/** Turns the month balances into the line of the account card; null with fewer than 2 points. */
export function buildBalanceCurve(values: readonly number[]): BalanceCurve | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2);
    return { x, y };
  });
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  const last = points[points.length - 1];
  return {
    line,
    area: `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`,
    endY: last ? (last.y / HEIGHT) * 100 : 0,
  };
}
