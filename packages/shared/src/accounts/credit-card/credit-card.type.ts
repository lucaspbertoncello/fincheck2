import type { z } from 'zod';

import type {
  createCreditCardRequestSchema,
  creditCardBrandSchema,
  creditCardDtoSchema,
  updateCreditCardRequestSchema,
} from './credit-card.schema.ts';

export namespace CreditCard {
  export type Dto = z.infer<typeof creditCardDtoSchema>;
  export type Brand = z.infer<typeof creditCardBrandSchema>;
  export type CreateRequest = z.infer<typeof createCreditCardRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateCreditCardRequestSchema>;
}
