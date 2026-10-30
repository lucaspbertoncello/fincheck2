import type { z } from 'zod';

import type {
  getSpendHeatmapQuerySchema,
  heatmapLevelSchema,
  spendHeatmapDayDtoSchema,
  spendHeatmapDtoSchema,
  spendHeatmapLevelRangeSchema,
} from './spend-heatmap.schema.ts';

export namespace SpendHeatmap {
  export type Dto = z.infer<typeof spendHeatmapDtoSchema>;
  export type Day = z.infer<typeof spendHeatmapDayDtoSchema>;
  export type LevelRange = z.infer<typeof spendHeatmapLevelRangeSchema>;
  export type Level = z.infer<typeof heatmapLevelSchema>;
  export type Query = z.infer<typeof getSpendHeatmapQuerySchema>;
}
