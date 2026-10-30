import { describe, expect, it } from 'vitest';

import {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from '#/common/payment-suggestion/payment-suggestion.schema.ts';

const ID = '0194f3a0-0000-7000-8000-000000000001';

describe('dismiss payment suggestion', () => {
  it('takes the transaction in the body of the POST and in the query of the DELETE', () => {
    expect(dismissPaymentSuggestionRequestSchema.parse({ transactionId: ID })).toEqual({
      transactionId: ID,
    });
    expect(dismissPaymentSuggestionQuerySchema.parse({ transactionId: ID })).toEqual({
      transactionId: ID,
    });
  });

  it('refuses a missing or malformed transaction id', () => {
    expect(dismissPaymentSuggestionQuerySchema.safeParse({}).success).toBe(false);
    expect(dismissPaymentSuggestionQuerySchema.safeParse({ transactionId: 'x' }).success).toBe(
      false,
    );
  });
});
