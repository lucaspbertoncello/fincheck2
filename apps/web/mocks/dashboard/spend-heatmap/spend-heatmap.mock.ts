import { computeHeatmapLevels } from '@fincheck/shared/dashboard/spend-heatmap/compute-heatmap-levels.util.ts';
import { heatmapLevelOf } from '@fincheck/shared/dashboard/spend-heatmap/heatmap-level-of.util.ts';
import {
  getSpendHeatmapQuerySchema,
  spendHeatmapDtoSchema,
} from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { HEATMAP_MONTHS } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.constant.ts';
import { http } from 'msw';

import { db } from '#mocks/state/mock-database.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';

// One square per day for the last 12 calendar months (or for the `from`/`to` asked): what was spent that day by competence
// (BR-DSH-001), the same lines the spending curve and the categories read.
export const spendHeatmapMock = [
  http.get(
    '/api/dashboard/spend-heatmap',
    handleRoute(
      { query: getSpendHeatmapQuerySchema, response: spendHeatmapDtoSchema },
      ({ query }) => {
        // `from` and `to` ask for a month or a year (the levels then scale to that period);
        // otherwise the 12 calendar months up to `until` (default today).
        const untilOn = query.to ?? query.until ?? TODAY;
        const fromOn = query.from ?? `${addMonths(untilOn.slice(0, 7), -(HEATMAP_MONTHS - 1))}-01`;

        const spentByDay = new Map<string, number>();
        for (const line of buildLines(db)) {
          if (line.nature !== 'expense') continue;
          if (line.competenceOn < fromOn || line.competenceOn > untilOn) continue;
          spentByDay.set(
            line.competenceOn,
            (spentByDay.get(line.competenceOn) ?? 0) - line.amountCents,
          );
        }

        const dates = Array.from({ length: daysBetween(fromOn, untilOn) + 1 }, (_, index) =>
          addDays(fromOn, index),
        );
        // A refund inside a day must not paint it green: the day's spending never goes below zero.
        const totals = dates.map((date) => Math.max(0, spentByDay.get(date) ?? 0));
        const levels = computeHeatmapLevels(totals);
        const days = dates.map((date, index) => {
          const totalCents = totals[index] ?? 0;

          return { date, totalCents, level: heatmapLevelOf(totalCents, levels) };
        });
        const peak = days.reduce<(typeof days)[number] | null>(
          (best, day) => (day.totalCents > (best?.totalCents ?? 0) ? day : best),
          null,
        );

        return {
          fromOn,
          untilOn,
          totalCents: totals.reduce((sum, total) => sum + total, 0),
          spendingDays: totals.filter((total) => total > 0).length,
          peak: peak ? { date: peak.date, totalCents: peak.totalCents } : null,
          levels,
          days,
        };
      },
    ),
  ),
];
