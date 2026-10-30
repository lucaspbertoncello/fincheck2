import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { paginatedSchema, paginationQuerySchema } from '#/common/pagination/pagination.schema.ts';

describe('paginationQuerySchema', () => {
  it('coerces the limit that arrives as text', () => {
    expect(paginationQuerySchema.parse({ limit: '50', cursor: 'abc' })).toEqual({
      limit: 50,
      cursor: 'abc',
    });
  });

  it('keeps the limit between 1 and 500', () => {
    expect(paginationQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: '501' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: '500' }).success).toBe(true);
  });
});

describe('paginatedSchema', () => {
  const schema = paginatedSchema(z.object({ id: z.string() }));

  it('has items and a nullable cursor', () => {
    expect(schema.safeParse({ items: [{ id: 'a' }], nextCursor: null }).success).toBe(true);
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});
