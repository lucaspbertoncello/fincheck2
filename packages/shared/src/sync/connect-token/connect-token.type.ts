import type { z } from 'zod';

import type { connectTokenDtoSchema } from './connect-token.schema.ts';

export namespace ConnectToken {
  export type Dto = z.infer<typeof connectTokenDtoSchema>;
}
