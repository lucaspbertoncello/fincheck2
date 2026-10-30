import { describe, expect, it } from 'vitest';

import {
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from '#/categories/category/category.schema.ts';

describe('createCategoryRequestSchema', () => {
  it('takes a kind, a name up to 40 characters and a known icon', () => {
    expect(
      createCategoryRequestSchema.safeParse({ kind: 'expense', name: 'Pets', icon: 'pet' }).success,
    ).toBe(true);
    expect(
      createCategoryRequestSchema.safeParse({ kind: 'expense', name: 'x'.repeat(41), icon: 'pet' })
        .success,
    ).toBe(false);
    expect(
      createCategoryRequestSchema.safeParse({ kind: 'expense', name: 'Pets', icon: 'rocket' })
        .success,
    ).toBe(false);
  });
});

describe('updateCategoryRequestSchema', () => {
  it('never changes the kind and needs a field', () => {
    expect(updateCategoryRequestSchema.safeParse({ kind: 'income' }).success).toBe(false);
    expect(updateCategoryRequestSchema.safeParse({}).success).toBe(false);
    expect(updateCategoryRequestSchema.safeParse({ name: 'Novo' }).success).toBe(true);
  });
});

describe('listCategoriesQuerySchema', () => {
  it('defaults the status to active', () => {
    expect(listCategoriesQuerySchema.parse({})).toEqual({ status: 'active' });
    expect(listCategoriesQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });
});
