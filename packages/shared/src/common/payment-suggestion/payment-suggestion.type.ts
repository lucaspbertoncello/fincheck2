import type { z } from 'zod';

import type { dismissPaymentSuggestionRequestSchema } from './payment-suggestion.schema.ts';

export namespace PaymentSuggestion {
  export type DismissRequest = z.infer<typeof dismissPaymentSuggestionRequestSchema>;
}
