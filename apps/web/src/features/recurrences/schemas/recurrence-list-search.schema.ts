import { z } from 'zod';

const optionalText = z.string().min(1).optional().catch(undefined);

/**
 * Screen state kept in the URL beside `month`: the side (`?flow=income|expense`, none means
 * expense), `?show=missing` (only what still lacks money, from "faltam" of the card), the chosen
 * day of the strip and the open modals. `?new=recurrence` opens "Nova
 * recorrência" on the chosen side (any screen can link to it), `?new=subscription` the same form
 * already as a card expense (the "+" of Assinaturas); `?edit=<recurrenceId>` the edit modal;
 * `?link=<occurrenceId>` and `?expected=<occurrenceId>` the occurrence dialogs.
 */
export const recurrenceListSearchSchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  flow: z.enum(['income', 'expense']).optional().catch(undefined),
  show: z.enum(['missing']).optional().catch(undefined),
  new: z.enum(['recurrence', 'subscription']).optional().catch(undefined),
  edit: optionalText,
  link: optionalText,
  expected: optionalText,
});

export type RecurrenceListSearch = z.infer<typeof recurrenceListSearchSchema>;
