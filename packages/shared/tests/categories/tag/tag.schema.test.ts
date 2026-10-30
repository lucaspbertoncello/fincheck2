import { describe, expect, it } from 'vitest';

import { createTagRequestSchema, listTagsQuerySchema } from '#/categories/tag/tag.schema.ts';

describe('tag schemas', () => {
  it('trims the name and keeps it between 1 and 30 characters', () => {
    expect(createTagRequestSchema.parse({ name: '  viagem ' })).toEqual({ name: 'viagem' });
    expect(createTagRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createTagRequestSchema.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
  });

  it('defaults includeArchived to false', () => {
    expect(listTagsQuerySchema.parse({})).toEqual({ includeArchived: false });
  });
});
