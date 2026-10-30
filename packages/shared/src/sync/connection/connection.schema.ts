import { z } from 'zod';

import { institutionCodeSchema } from '../../accounts/institution/institution.schema.ts';
import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { runSummaryDtoSchema } from '../run/run.schema.ts';
import {
  CONNECTION_ERROR_CODES,
  CONNECTION_STATUSES,
  HISTORY_STATUSES,
} from './connection.constant.ts';

export const connectionStatusSchema = z.enum(CONNECTION_STATUSES);
export const connectionErrorCodeSchema = z.enum(CONNECTION_ERROR_CODES);
export const historyStatusSchema = z.enum(HISTORY_STATUSES);

export const connectionAccountDtoSchema = z.object({
  accountId: idSchema,
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card']),
});

export const connectionHistoryDtoSchema = z.object({
  status: historyStatusSchema,
  fromOn: businessDateSchema.nullable(),
  transactionCount: z.int().nonnegative(),
});

export const pendingAccountMatchSchema = z.object({
  pluggyAccountId: z.string(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card']),
  numberHint: z.string().nullable(),
  candidates: z.array(
    z.object({
      accountId: idSchema,
      name: z.string(),
      type: z.enum(['checking', 'savings', 'wallet', 'credit_card']),
      source: z.enum(['pluggy', 'manual']),
    }),
  ),
});

export const connectionDtoSchema = z.object({
  id: idSchema,
  institutionCode: institutionCodeSchema,
  institutionName: z.string(),
  status: connectionStatusSchema,
  errorCode: connectionErrorCodeSchema.nullable(),
  lastBankUpdateAt: instantSchema.nullable(),
  lastSuccessAt: instantSchema.nullable(),
  isStale: z.boolean(),
  history: connectionHistoryDtoSchema,
  accounts: z.array(connectionAccountDtoSchema),
  lastRun: runSummaryDtoSchema.nullable(),
  pendingAccountMatches: z.array(pendingAccountMatchSchema),
});

export const createConnectionRequestSchema = z.object({
  pluggyItemId: z.string().length(36),
});

export const resolveAccountMatchesRequestSchema = z.object({
  matches: z.array(z.object({ pluggyAccountId: z.string(), accountId: idSchema.nullable() })),
});
