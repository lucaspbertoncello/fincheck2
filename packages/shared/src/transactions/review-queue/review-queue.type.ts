import type { z } from 'zod';

import type {
  reviewQueueDtoSchema,
  reviewQueueItemDtoSchema,
  reviewQueueQuerySchema,
} from './review-queue.schema.ts';

export namespace ReviewQueue {
  export type Query = z.infer<typeof reviewQueueQuerySchema>;
  export type ItemDto = z.infer<typeof reviewQueueItemDtoSchema>;
  export type Dto = z.infer<typeof reviewQueueDtoSchema>;
}
