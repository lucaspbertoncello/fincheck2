import type { z } from 'zod';

import type {
  createTagRequestSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  updateTagRequestSchema,
} from './tag.schema.ts';

export namespace Tag {
  export type Dto = z.infer<typeof tagDtoSchema>;
  export type CreateRequest = z.infer<typeof createTagRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateTagRequestSchema>;
  export type ListQuery = z.infer<typeof listTagsQuerySchema>;
}
