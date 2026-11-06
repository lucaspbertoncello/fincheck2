import { z } from 'zod';

import { idSchema } from './id.schema.ts';

// The `:id` of a route: a UUID. A malformed one is a 400, not a 404.
export const idParamSchema = z.object({ id: idSchema });
