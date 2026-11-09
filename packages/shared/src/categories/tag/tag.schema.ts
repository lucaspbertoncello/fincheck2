import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';

export const tagDtoSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  name: z.string(),
  archivedAt: instantSchema.nullable(),
  transactionCount: z.int().nonnegative(),
});

const tagNameSchema = z.string().trim().min(1).max(30);

export const createTagRequestSchema = z.object({ categoryId: idSchema, name: tagNameSchema });
export const updateTagRequestSchema = z.object({ name: tagNameSchema });
export const listTagsQuerySchema = z.object({
  categoryId: idSchema.optional(),
  includeArchived: queryBooleanSchema.default(false),
});
