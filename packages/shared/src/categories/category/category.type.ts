import type { z } from 'zod';

import type {
  categoryDtoSchema,
  categoryIconSchema,
  categoryKindSchema,
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from './category.schema.ts';

export namespace Category {
  export type Dto = z.infer<typeof categoryDtoSchema>;
  export type Kind = z.infer<typeof categoryKindSchema>;
  export type Icon = z.infer<typeof categoryIconSchema>;
  export type CreateRequest = z.infer<typeof createCategoryRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateCategoryRequestSchema>;
  export type ListQuery = z.infer<typeof listCategoriesQuerySchema>;
}
