import { z } from 'zod';

// Every list answer is an object (`{ items }`), so it can grow without breaking the front.
export function listResponseSchema<Item extends z.ZodType>(item: Item) {
  return z.object({ items: z.array(item) });
}
