import { describe, expect, it } from 'vitest';

import {
  getSpendHeatmapQuerySchema,
  spendHeatmapDtoSchema,
} from '#/dashboard/spend-heatmap/spend-heatmap.schema.ts';

describe('getSpendHeatmapQuerySchema', () => {
  it('has no required field and takes a real date as until', () => {
    expect(getSpendHeatmapQuerySchema.parse({})).toEqual({});
    expect(getSpendHeatmapQuerySchema.safeParse({ until: '2026-10-30' }).success).toBe(true);
    expect(getSpendHeatmapQuerySchema.safeParse({ until: '2026-02-30' }).success).toBe(false);
    expect(getSpendHeatmapQuerySchema.safeParse({ until: '2026-10' }).success).toBe(false);
  });
});

describe('spendHeatmapDtoSchema', () => {
  const base = {
    fromOn: '2026-10-01',
    untilOn: '2026-10-02',
    totalCents: 3000,
    spendingDays: 1,
    peak: { date: '2026-10-02', totalCents: 3000 },
    levels: [
      { level: 1, minCents: 1, maxCents: 3000 },
      { level: 2, minCents: 3001, maxCents: 3000 },
      { level: 3, minCents: 3001, maxCents: 3000 },
      { level: 4, minCents: 3001, maxCents: null },
    ],
    days: [
      { date: '2026-10-01', totalCents: 0, level: 0 },
      { date: '2026-10-02', totalCents: 3000, level: 1 },
    ],
  };

  it('reads the days, the peak and the ranges', () => {
    expect(spendHeatmapDtoSchema.safeParse(base).success).toBe(true);
    expect(
      spendHeatmapDtoSchema.safeParse({ ...base, peak: null, levels: [], spendingDays: 0 }).success,
    ).toBe(true);
  });

  it('refuses a level above 4 and a negative day', () => {
    const day = { date: '2026-10-02', totalCents: 3000 };

    expect(spendHeatmapDtoSchema.safeParse({ ...base, days: [{ ...day, level: 5 }] }).success).toBe(
      false,
    );
    expect(
      spendHeatmapDtoSchema.safeParse({ ...base, days: [{ ...day, totalCents: -1, level: 0 }] })
        .success,
    ).toBe(false);
  });
});
