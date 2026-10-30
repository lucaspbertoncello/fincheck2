import type { z } from 'zod';

import type {
  createInvoicePaymentRequestSchema,
  invoicePaymentDtoSchema,
  invoicePaymentParamsSchema,
} from './invoice-payment.schema.ts';

export namespace InvoicePayment {
  export type Dto = z.infer<typeof invoicePaymentDtoSchema>;
  export type CreateRequest = z.infer<typeof createInvoicePaymentRequestSchema>;
  export type Params = z.infer<typeof invoicePaymentParamsSchema>;
}
