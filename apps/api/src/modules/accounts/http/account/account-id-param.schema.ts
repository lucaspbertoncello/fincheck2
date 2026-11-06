import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { z } from 'zod';

// The `:id` of every route of an account.
export const accountIdParamSchema = z.object({ id: idSchema });
