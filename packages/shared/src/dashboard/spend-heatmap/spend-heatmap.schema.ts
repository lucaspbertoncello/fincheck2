import { z } from 'zod';

import { businessDateSchema } from '../../common/date/date.schema.ts';
import { nonNegativeCentsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import { countHeatmapDays } from './count-heatmap-days.util.ts';
import { HEATMAP_MAX_RANGE_DAYS } from './spend-heatmap.constant.ts';

export const heatmapLevelSchema = z.int().min(0).max(4);

// `until` is the last day of the map (default: today in Sao Paulo). The map starts on the 1st of
// the month 11 months before it, so it always shows 12 whole calendar months, the last one up to
// `until`. Or `from` and `to` (both ends included, up to 366 days): a month or a year, as the
// Mes | Ano switch of Perfil asks for it. The two forms do not combine.
export const getSpendHeatmapQuerySchema = z
  .object({
    until: businessDateSchema.optional(),
    from: businessDateSchema.optional(),
    to: businessDateSchema.optional(),
  })
  .superRefine((value, context) => {
    const hasRange = value.from !== undefined || value.to !== undefined;
    if (value.until !== undefined && hasRange) {
      context.addIssue({
        code: 'custom',
        path: ['until'],
        message: 'until does not combine with from or to',
      });
    }
    if ((value.from === undefined) !== (value.to === undefined)) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'from and to come together' });
    }
    if (value.from !== undefined && value.to !== undefined) {
      const days = countHeatmapDays(value.from, value.to);
      if (days < 1) {
        context.addIssue({ code: 'custom', path: ['from'], message: 'from is after to' });
      } else if (days > HEATMAP_MAX_RANGE_DAYS) {
        context.addIssue({
          code: 'custom',
          path: ['to'],
          message: `the range is longer than ${HEATMAP_MAX_RANGE_DAYS} days`,
        });
      }
    }
  });

export const spendHeatmapLevelRangeSchema = z.object({
  level: z.int().min(1).max(4),
  minCents: positiveCentsSchema,
  // null on the last level (no ceiling). A level can be empty when many days spent the same.
  maxCents: positiveCentsSchema.nullable(),
});

export const spendHeatmapDayDtoSchema = z.object({
  date: businessDateSchema,
  // Spent that day, by competence (BR-DSH-001). Never negative: a refund does not make a day green.
  totalCents: nonNegativeCentsSchema,
  level: heatmapLevelSchema,
});

export const spendHeatmapDtoSchema = z.object({
  fromOn: businessDateSchema,
  untilOn: businessDateSchema,
  totalCents: nonNegativeCentsSchema,
  spendingDays: z.int().nonnegative(),
  // The day that spent the most; null when nothing was spent.
  peak: z.object({ date: businessDateSchema, totalCents: positiveCentsSchema }).nullable(),
  // Empty when no day had spending; otherwise the four ranges of levels 1 to 4.
  levels: z.array(spendHeatmapLevelRangeSchema),
  // One per day from `fromOn` to `untilOn`, in order, no gaps.
  days: z.array(spendHeatmapDayDtoSchema),
});
