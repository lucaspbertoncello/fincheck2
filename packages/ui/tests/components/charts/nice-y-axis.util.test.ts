import { describe, expect, it } from 'vitest';

import { formatAxisCents } from '#/components/charts/format-axis-cents.util.ts';
import { niceYAxis } from '#/components/charts/nice-y-axis.util.ts';

describe('niceYAxis', () => {
  it('has no repeated label when the values are zero or tiny', () => {
    for (const max of [0, 50, 100, 150, 250, 400]) {
      const labels = niceYAxis(max).ticks.map(formatAxisCents);

      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('keeps the round steps for bigger values', () => {
    expect(niceYAxis(500_000).ticks).toEqual([0, 100_000, 200_000, 300_000, 400_000, 500_000]);
  });
});
