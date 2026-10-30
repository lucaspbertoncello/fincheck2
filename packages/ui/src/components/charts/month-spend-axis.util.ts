import type { MonthSpendRow } from '#/components/charts/month-spend-series.util.ts';

/** X axis ticks: 1, 8, 15, 22 and the last day of the month (components.md 12.1). */
export function monthSpendXTicks(daysInMonth: number): number[] {
  return [...new Set([1, 8, 15, 22, daysInMonth])].filter((day) => day <= daysInMonth);
}

export type NiceAxis = {
  /** Tick values in cents, from 0 to `top`. */
  ticks: number[];
  top: number;
};

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

const compactNumber = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Axis label for a value in cents: "0", "500", "1,5 mil", "5 mil". */
export function formatAxisCents(cents: number): string {
  const reais = Math.round(cents / 100);
  return reais >= 1000 ? `${compactNumber.format(reais / 1000)} mil` : String(reais);
}

/** Highest value across both series, in cents. */
export function maxOfRows(rows: readonly MonthSpendRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.current ?? 0, row.previous), 0);
}
