import { z } from 'zod';

/** Search param shared by every route: the selected month as `YYYY-MM`. Absent means the current month. */
export const monthSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
});

export type MonthSearch = z.infer<typeof monthSearchSchema>;
