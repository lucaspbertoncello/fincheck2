import { z } from 'zod';

const optionalText = z.string().min(1).optional().catch(undefined);

/**
 * Screen state kept in the URL beside `month`: the chosen day of the strip and the open modals.
 * `?new=recurrence` opens "Nova recorrência" (any screen can link to it); `?edit=<recurrenceId>`
 * the edit modal; `?link=<occurrenceId>` and `?expected=<occurrenceId>` the occurrence dialogs.
 */
export const recurrenceListSearchSchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  new: z.literal('recurrence').optional().catch(undefined),
  edit: optionalText,
  link: optionalText,
  expected: optionalText,
});

export type RecurrenceListSearch = z.infer<typeof recurrenceListSearchSchema>;
