import { describe, expect, it } from 'vitest';

import { formatHeatmapDayShort } from '#/components/heatmap/format-heatmap-day-short.util.ts';

describe('formatHeatmapDayShort', () => {
  it('writes the short weekday, the day and the short month, with no "de"', () => {
    expect(formatHeatmapDayShort('2026-11-09')).toBe('seg., 9 nov.');
    expect(formatHeatmapDayShort('2026-03-14')).toBe('sáb., 14 mar.');
  });

  it('adds the year only for a day from another year than today', () => {
    expect(formatHeatmapDayShort('2026-11-09', '2026-11-09')).toBe('seg., 9 nov.');
    expect(formatHeatmapDayShort('2025-12-31', '2026-11-09')).toBe('qua., 31 dez. 2025');
  });
});
