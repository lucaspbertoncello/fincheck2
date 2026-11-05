import type { z } from 'zod';

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
}
