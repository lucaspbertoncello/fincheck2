import type { z } from 'zod';

import type {
  connectionAccountDtoSchema,
  connectionDtoSchema,
  connectionErrorCodeSchema,
  connectionHistoryDtoSchema,
  connectionStatusSchema,
  createConnectionRequestSchema,
  historyStatusSchema,
  pendingAccountMatchSchema,
  resolveAccountMatchesRequestSchema,
} from './connection.schema.ts';

export namespace Connection {
  export type Dto = z.infer<typeof connectionDtoSchema>;
  export type Status = z.infer<typeof connectionStatusSchema>;
  export type ErrorCode = z.infer<typeof connectionErrorCodeSchema>;
  export type HistoryStatus = z.infer<typeof historyStatusSchema>;
  export type Account = z.infer<typeof connectionAccountDtoSchema>;
  export type History = z.infer<typeof connectionHistoryDtoSchema>;
  export type PendingMatch = z.infer<typeof pendingAccountMatchSchema>;
  export type CreateRequest = z.infer<typeof createConnectionRequestSchema>;
  export type ResolveMatchesRequest = z.infer<typeof resolveAccountMatchesRequestSchema>;
}
