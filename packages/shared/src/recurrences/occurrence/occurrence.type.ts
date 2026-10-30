import type { z } from 'zod';

import type {
  decideOccurrenceDifferenceRequestSchema,
  linkOccurrencePaymentRequestSchema,
  listOccurrencesQuerySchema,
  occurrenceCandidateDtoSchema,
  occurrenceDifferenceSchema,
  occurrenceDtoSchema,
  occurrenceParamsSchema,
  occurrencePaymentParamsSchema,
  occurrencePaymentSchema,
  occurrenceStatusSchema,
  updateOccurrenceRequestSchema,
} from './occurrence.schema.ts';

export namespace Occurrence {
  export type Dto = z.infer<typeof occurrenceDtoSchema>;
  export type Status = z.infer<typeof occurrenceStatusSchema>;
  export type LinkedBy = Payment['linkedBy'];
  export type Decision = NonNullable<Difference['decision']>;
  export type Payment = z.infer<typeof occurrencePaymentSchema>;
  export type Difference = z.infer<typeof occurrenceDifferenceSchema>;
  export type CandidateDto = z.infer<typeof occurrenceCandidateDtoSchema>;
  export type Params = z.infer<typeof occurrenceParamsSchema>;
  export type PaymentParams = z.infer<typeof occurrencePaymentParamsSchema>;
  export type ListQuery = z.infer<typeof listOccurrencesQuerySchema>;
  export type UpdateRequest = z.infer<typeof updateOccurrenceRequestSchema>;
  export type LinkPaymentRequest = z.infer<typeof linkOccurrencePaymentRequestSchema>;
  export type DecideDifferenceRequest = z.infer<typeof decideOccurrenceDifferenceRequestSchema>;
}
