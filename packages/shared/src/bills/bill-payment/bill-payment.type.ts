import type { z } from 'zod';

import type {
  billPaymentDtoSchema,
  billPaymentParamsSchema,
  createBillPaymentRequestSchema,
} from './bill-payment.schema.ts';

export namespace BillPayment {
  export type Dto = z.infer<typeof billPaymentDtoSchema>;
  export type CreateRequest = z.infer<typeof createBillPaymentRequestSchema>;
  export type Params = z.infer<typeof billPaymentParamsSchema>;
}
