import { describe, expect, it } from 'vitest';

import {
  decideOccurrenceDifferenceRequestSchema,
  listOccurrencesQuerySchema,
  updateOccurrenceRequestSchema,
} from '#/recurrences/occurrence/occurrence.schema.ts';

describe('occurrence request schemas', () => {
  it('lists by month, with the attention filter as text', () => {
    expect(listOccurrencesQuerySchema.safeParse({}).success).toBe(false);
    expect(listOccurrencesQuerySchema.parse({ month: '2026-10', needsAttention: 'true' })).toEqual({
      month: '2026-10',
      needsAttention: true,
    });
  });

  it('edits only a positive expected amount', () => {
    expect(updateOccurrenceRequestSchema.safeParse({ expectedAmountCents: 42500 }).success).toBe(
      true,
    );
    expect(updateOccurrenceRequestSchema.safeParse({ expectedAmountCents: 0 }).success).toBe(false);
  });

  it('decides the difference with update or keep', () => {
    expect(decideOccurrenceDifferenceRequestSchema.safeParse({ decision: 'update' }).success).toBe(
      true,
    );
    expect(decideOccurrenceDifferenceRequestSchema.safeParse({ decision: 'updated' }).success).toBe(
      false,
    );
  });
});
