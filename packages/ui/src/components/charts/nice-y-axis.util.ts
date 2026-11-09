import type { NiceAxis } from '#/components/charts/nice-axis.type.ts';

const STEP_MULTIPLIERS = [1, 2, 5, 10];
const MIN_STEP_REAIS = 1;

/**
 * Round tick values (1, 2 or 5 times a power of ten, in reais) that cover `maxCents`. A step is at
 * least R$ 1, since the labels are whole reais: smaller steps would repeat the same label.
 */
export function niceYAxis(maxCents: number): NiceAxis {
  const maxReais = Math.max(maxCents / 100, 1);
  const rough = maxReais / 5;
  const base = 10 ** Math.floor(Math.log10(rough));
  const niceStep = (STEP_MULTIPLIERS.map((m) => m * base).find((s) => s >= rough) ?? base) || 1;
  const stepReais = Math.max(niceStep, MIN_STEP_REAIS);
  const count = Math.ceil(maxReais / stepReais);
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Math.round(index * stepReais * 100),
  );
  return { ticks, top: ticks[ticks.length - 1] ?? 0 };
}
