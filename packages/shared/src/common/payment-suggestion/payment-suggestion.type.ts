import type { z } from 'zod';

import type {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from './payment-suggestion.schema.ts';

export namespace PaymentSuggestion {
  export type DismissRequest = z.infer<typeof dismissPaymentSuggestionRequestSchema>;
  export type DismissQuery = z.infer<typeof dismissPaymentSuggestionQuerySchema>;
}
