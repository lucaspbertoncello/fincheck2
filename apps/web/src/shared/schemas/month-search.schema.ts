import { z } from 'zod';

/**
 * Search param shared by every route: the selected month as `YYYY-MM`. Absent means the current
 * month. The object is loose: the params each screen reads (`view`, `new`, `edit`, `filter`,
 * `ruleId`, ...) pass through the root validation untouched.
 */
export const monthSearchSchema = z.looseObject({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
});

export type MonthSearch = z.infer<typeof monthSearchSchema>;
