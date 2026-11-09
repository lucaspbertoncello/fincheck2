import { describe, expect, it } from 'vitest';

import {
  createTagRequestSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  updateTagRequestSchema,
} from '#/categories/tag/tag.schema.ts';

const CATEGORY_ID = '019a5a00-0000-7000-8000-000000000010';

describe('tag schemas', () => {
  it('trims the name and keeps it between 1 and 30 characters', () => {
    expect(createTagRequestSchema.parse({ categoryId: CATEGORY_ID, name: '  viagem ' })).toEqual({
      categoryId: CATEGORY_ID,
      name: 'viagem',
    });
    expect(createTagRequestSchema.safeParse({ categoryId: CATEGORY_ID, name: '   ' }).success).toBe(
      false,
    );
    expect(
      createTagRequestSchema.safeParse({ categoryId: CATEGORY_ID, name: 'x'.repeat(31) }).success,
    ).toBe(false);
  });

  it('requires the category on create: a tag is never loose', () => {
    expect(createTagRequestSchema.safeParse({ name: 'viagem' }).success).toBe(false);
    expect(createTagRequestSchema.safeParse({ categoryId: 'nope', name: 'viagem' }).success).toBe(
      false,
    );
  });

  it('does not let a rename move the tag to another category', () => {
    expect(updateTagRequestSchema.parse({ name: 'x', categoryId: CATEGORY_ID })).toEqual({
      name: 'x',
    });
  });

  it('shows the category in the dto', () => {
    const dto = {
      id: '019a5a00-0000-7000-8000-000000000011',
      categoryId: CATEGORY_ID,
      name: 'viagem',
      archivedAt: null,
      transactionCount: 0,
    };
    expect(tagDtoSchema.parse(dto)).toEqual(dto);
    expect(tagDtoSchema.safeParse({ ...dto, categoryId: undefined }).success).toBe(false);
  });

  it('defaults includeArchived to false and filters by category when asked', () => {
    expect(listTagsQuerySchema.parse({})).toEqual({ includeArchived: false });
    expect(listTagsQuerySchema.parse({ categoryId: CATEGORY_ID })).toEqual({
      categoryId: CATEGORY_ID,
      includeArchived: false,
    });
  });
});
