import type { SpendHeatmapDay } from '@fincheck/ui';

/** Level cut-offs in cents (the API sends quartiles; the gallery fakes four fixed ones). */
const LEVEL_FROM_CENTS = [1, 2_000, 6_000, 15_000] as const;

/** A repeatable spread of spending in [0, 1): no random, so the gallery looks the same every time. */
function spread(index: number): number {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function toLevel(totalCents: number): number {
  return LEVEL_FROM_CENTS.filter((from) => totalCents >= from).length;
}

/** 12 whole months, 1 Nov 2025 to 30 Oct 2026: weekends heavier, a third of the days empty. */
export const SAMPLE_HEATMAP_DAYS: SpendHeatmapDay[] = (() => {
  const days: SpendHeatmapDay[] = [];
  const end = Date.UTC(2026, 9, 30);
  let index = 0;
  for (let time = Date.UTC(2025, 10, 1); time <= end; time += 86_400_000) {
    const date = new Date(time);
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const roll = spread(index);
    const totalCents = roll < 0.3 ? 0 : Math.round(roll ** 2 * (isWeekend ? 32_000 : 18_000));
    days.push({
      date: date.toISOString().slice(0, 10),
      totalCents,
      level: toLevel(totalCents),
    });
    index += 1;
  }
  return days;
})();
