import type { z } from 'zod';

import type {
  invoiceBreakdownSchema,
  invoiceDetailDtoSchema,
  invoiceCategoryShareSchema,
  invoiceDtoSchema,
  invoiceHighlightsSchema,
  invoiceItemSchema,
  invoiceParamsSchema,
  invoicePaymentSuggestionSchema,
  invoiceStatusSchema,
  listInvoicesQuerySchema,
  openInvoiceItemSchema,
  updateInvoiceRequestSchema,
} from './invoice.schema.ts';

export namespace Invoice {
  export type Dto = z.infer<typeof invoiceDtoSchema>;
  export type DetailDto = z.infer<typeof invoiceDetailDtoSchema>;
  export type Status = z.infer<typeof invoiceStatusSchema>;
  export type Breakdown = z.infer<typeof invoiceBreakdownSchema>;
  export type PaymentSuggestion = z.infer<typeof invoicePaymentSuggestionSchema>;
  export type CategoryShare = z.infer<typeof invoiceCategoryShareSchema>;
  export type Highlights = z.infer<typeof invoiceHighlightsSchema>;
  export type Item = z.infer<typeof invoiceItemSchema>;
  export type OpenItem = z.infer<typeof openInvoiceItemSchema>;
  export type Params = z.infer<typeof invoiceParamsSchema>;
  export type ListQuery = z.infer<typeof listInvoicesQuerySchema>;
  export type UpdateRequest = z.infer<typeof updateInvoiceRequestSchema>;
}
