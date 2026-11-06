const STEP_MULTIPLIERS = [1, 2, 5, 10];

export type NiceValueRange = {
  /** Round tick values from `bottom` to `top`. */
  ticks: number[];
  bottom: number;
  top: number;
};

/**
 * Round ticks (1, 2 or 5 times a power of ten) that frame `min` to `max`, with at most five bands.
 * The axis does not start at zero: a value that only grows a little would read as a flat line.
 */
export function niceValueRange(min: number, max: number): NiceValueRange {
  const span = Math.max(max - min, Math.abs(max) * 0.05, 1);
  const rough = span / 4;
  const base = 10 ** Math.floor(Math.log10(rough));
  const step =
    STEP_MULTIPLIERS.map((multiplier) => multiplier * base).find((size) => size >= rough) ?? base;
  const bottom = Math.floor(min / step) * step;
  const top = Math.max(Math.ceil(max / step) * step, bottom + step);
  const count = Math.round((top - bottom) / step);
  const ticks = Array.from({ length: count + 1 }, (_, index) => bottom + index * step);

  return { ticks, bottom, top };
}
