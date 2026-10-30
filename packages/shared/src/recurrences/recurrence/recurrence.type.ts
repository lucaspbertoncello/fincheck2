import type { z } from 'zod';

import type {
  amountModeSchema,
  applyFromSchema,
  createRecurrenceRequestSchema,
  createRecurrenceResponseSchema,
  dateRuleSchema,
  employmentRegimeSchema,
  listRecurrencesQuerySchema,
  previewRecurrenceRequestSchema,
  previewRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceDtoSchema,
  recurrenceKindSchema,
  recurrenceListItemSchema,
  recurrenceParamsSchema,
  recurrenceSummarySchema,
  summaryRecurrencesQuerySchema,
  updateRecurrenceRequestSchema,
} from './recurrence.schema.ts';

export namespace Recurrence {
  export type Dto = z.infer<typeof recurrenceDtoSchema>;
  export type DetailDto = z.infer<typeof recurrenceDetailDtoSchema>;
  export type ListItem = z.infer<typeof recurrenceListItemSchema>;
  export type Summary = z.infer<typeof recurrenceSummarySchema>;
  export type Kind = z.infer<typeof recurrenceKindSchema>;
  export type EmploymentRegime = z.infer<typeof employmentRegimeSchema>;
  export type AmountMode = z.infer<typeof amountModeSchema>;
  export type DateRule = z.infer<typeof dateRuleSchema>;
  export type DateRuleType = DateRule['type'];
  export type ApplyFrom = z.infer<typeof applyFromSchema>;
  export type Params = z.infer<typeof recurrenceParamsSchema>;
  export type ListQuery = z.infer<typeof listRecurrencesQuerySchema>;
  export type SummaryQuery = z.infer<typeof summaryRecurrencesQuerySchema>;
  export type CreateRequest = z.infer<typeof createRecurrenceRequestSchema>;
  export type CreateResponse = z.infer<typeof createRecurrenceResponseSchema>;
  export type UpdateRequest = z.infer<typeof updateRecurrenceRequestSchema>;
  export type PreviewRequest = z.infer<typeof previewRecurrenceRequestSchema>;
  export type PreviewResponse = z.infer<typeof previewRecurrenceResponseSchema>;
}
