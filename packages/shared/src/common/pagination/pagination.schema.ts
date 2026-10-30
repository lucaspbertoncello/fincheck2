import { z } from 'zod';

// Opaque cursor pagination, only where a list has no natural limit.
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().min(1).optional(),
});

export function paginatedSchema<Item extends z.ZodType>(item: Item) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
