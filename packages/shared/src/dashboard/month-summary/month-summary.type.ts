import type { z } from 'zod';

import type { monthSummaryAlertSchema, monthSummaryDtoSchema } from './month-summary.schema.ts';

export namespace MonthSummary {
  export type Dto = z.infer<typeof monthSummaryDtoSchema>;
  export type Alert = z.infer<typeof monthSummaryAlertSchema>;
}
