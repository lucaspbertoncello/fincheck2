import { z } from 'zod';

import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { CATEGORY_ICONS, CATEGORY_KINDS } from './category.constant.ts';

export const categoryKindSchema = z.enum(CATEGORY_KINDS);
export const categoryIconSchema = z.enum(CATEGORY_ICONS);

export const categoryDtoSchema = z.object({
  id: idSchema,
  kind: categoryKindSchema,
  name: z.string(),
  icon: categoryIconSchema,
  isDefault: z.boolean(),
  archivedAt: instantSchema.nullable(),
  transactionCount: z.int().nonnegative(),
  ruleCount: z.int().nonnegative(),
  lastUsedOn: businessDateSchema.nullable(),
});

const categoryNameSchema = z.string().trim().min(1).max(40);

export const createCategoryRequestSchema = z.object({
  kind: categoryKindSchema,
  name: categoryNameSchema,
  icon: categoryIconSchema,
});

// `kind` is out of the schema on purpose: the type of a category never changes.
export const updateCategoryRequestSchema = z
  .strictObject({ name: categoryNameSchema.optional(), icon: categoryIconSchema.optional() })
  .refine((value) => value.name !== undefined || value.icon !== undefined, {
    message: 'Send at least one field',
  });

export const listCategoriesQuerySchema = z.object({
  kind: categoryKindSchema.optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});
