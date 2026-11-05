import type { NiceAxis } from '#/components/charts/nice-axis.type.ts';

const STEP_MULTIPLIERS = [1, 2, 5, 10];

/** Round tick values (1, 2 or 5 times a power of ten, in reais) that cover `maxCents`. */
export function niceYAxis(maxCents: number): NiceAxis {
  const maxReais = Math.max(maxCents / 100, 1);
  const rough = maxReais / 5;
  const base = 10 ** Math.floor(Math.log10(rough));
  const stepReais = (STEP_MULTIPLIERS.map((m) => m * base).find((s) => s >= rough) ?? base) || 1;
  const count = Math.ceil(maxReais / stepReais);
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Math.round(index * stepReais * 100),
  );
  return { ticks, top: ticks[ticks.length - 1] ?? 0 };
}
