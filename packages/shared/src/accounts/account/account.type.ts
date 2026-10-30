import type { z } from 'zod';

import type {
  accountConnectionDtoSchema,
  accountDtoSchema,
  accountSourceSchema,
  accountTypeSchema,
  createAccountRequestSchema,
  listAccountsQuerySchema,
  updateAccountRequestSchema,
} from './account.schema.ts';

export namespace Account {
  export type Dto = z.infer<typeof accountDtoSchema>;
  export type Type = z.infer<typeof accountTypeSchema>;
  export type Source = z.infer<typeof accountSourceSchema>;
  export type Connection = z.infer<typeof accountConnectionDtoSchema>;
  export type ListQuery = z.infer<typeof listAccountsQuerySchema>;
  export type CreateRequest = z.infer<typeof createAccountRequestSchema>;
  export type UpdateRequest = z.infer<typeof updateAccountRequestSchema>;
}
