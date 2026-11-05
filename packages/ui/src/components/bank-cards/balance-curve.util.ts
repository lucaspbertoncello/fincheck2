import type { BalanceCurve } from '#/components/bank-cards/balance-curve.type.ts';

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
  // Smooth line: each segment is a cubic curve whose handles sit at the middle of its width, so
  // the curve stays flat at every point and never overshoots the balances.
  const line = points
    .map((p, i) => {
      const previous = points[i - 1];
      if (!previous) return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      const middle = (previous.x + p.x) / 2;
      return `C${middle.toFixed(2)} ${previous.y.toFixed(2)} ${middle.toFixed(2)} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .join(' ');
  const last = points[points.length - 1];
  return {
    line,
    area: `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`,
    endY: last ? (last.y / HEIGHT) * 100 : 0,
  };
}
