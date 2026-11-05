import type { z } from 'zod';

import type { categoryTrendDtoSchema } from '../category-trend/category-trend.schema.ts';

import type {
  categoryBreakdownDtoSchema,
  categoryBreakdownExpenseItemSchema,
  categoryBreakdownIncomeItemSchema,
  categoryBreakdownQuerySchema,
} from './category-breakdown.schema.ts';

export namespace CategoryBreakdown {
  export type Query = z.infer<typeof categoryBreakdownQuerySchema>;
  export type Dto = z.infer<typeof categoryBreakdownDtoSchema>;
  export type ExpenseItem = z.infer<typeof categoryBreakdownExpenseItemSchema>;
  export type IncomeItem = z.infer<typeof categoryBreakdownIncomeItemSchema>;
  // The 12-month bars of the category page (GET /dashboard/categories/:id/trend).
  export type Trend = z.infer<typeof categoryTrendDtoSchema>;
  export type TrendMonth = Trend['months'][number];
}
