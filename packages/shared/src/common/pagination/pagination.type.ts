import type { z } from 'zod';

import type { paginationQuerySchema } from './pagination.schema.ts';

export namespace Pagination {
  export type Query = z.infer<typeof paginationQuerySchema>;
}
