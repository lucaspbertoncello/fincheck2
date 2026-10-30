import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { CONNECTION_ERROR_CODES } from '../connection/connection.constant.ts';
import { RUN_STATUSES, RUN_TRIGGERS } from './run.constant.ts';

export const runTriggerSchema = z.enum(RUN_TRIGGERS);
export const runStatusSchema = z.enum(RUN_STATUSES);

export const runSummaryDtoSchema = z.object({
  id: idSchema,
  trigger: runTriggerSchema,
  status: runStatusSchema,
  startedAt: instantSchema,
  finishedAt: instantSchema.nullable(),
  errorCode: z.enum(CONNECTION_ERROR_CODES).nullable(),
});

export const runDtoSchema = runSummaryDtoSchema.extend({
  createdCount: z.int().nonnegative(),
  updatedCount: z.int().nonnegative(),
  removedCount: z.int().nonnegative(),
});
