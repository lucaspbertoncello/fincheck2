import type { z } from 'zod';

import type {
  billCounterpartyDtoSchema,
  billDirectionSchema,
  billDtoSchema,
  billKindSchema,
  billOriginSchema,
  billParamsSchema,
  billPaymentCandidateDtoSchema,
  createBillRequestSchema,
  listBillPaymentCandidatesQuerySchema,
  listBillsQuerySchema,
  updateBillRequestSchema,
} from './bill.schema.ts';

export namespace Bill {
  export type Dto = z.infer<typeof billDtoSchema>;
  export type Direction = z.infer<typeof billDirectionSchema>;
  export type Kind = z.infer<typeof billKindSchema>;
  export type Status = Dto['status'];
  export type ListStatus = NonNullable<ListQuery['status']>;
  export type Origin = z.infer<typeof billOriginSchema>;
  export type Params = z.infer<typeof billParamsSchema>;
  export type ListQuery = z.infer<typeof listBillsQuerySchema>;
  export type CreateRequest = z.infer<typeof createBillRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateBillRequestSchema>;
  export type CounterpartyDto = z.infer<typeof billCounterpartyDtoSchema>;
  export type PaymentCandidateDto = z.infer<typeof billPaymentCandidateDtoSchema>;
  export type PaymentCandidatesQuery = z.infer<typeof listBillPaymentCandidatesQuerySchema>;
}
