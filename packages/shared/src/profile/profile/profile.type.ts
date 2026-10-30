import type { z } from 'zod';

import type {
  profileDtoSchema,
  profileIncomeSourceSchema,
  updateProfileRequestSchema,
} from './profile.schema.ts';

export namespace Profile {
  export type Dto = z.infer<typeof profileDtoSchema>;
  export type IncomeSource = z.infer<typeof profileIncomeSourceSchema>;
  export type UpdateRequest = z.infer<typeof updateProfileRequestSchema>;
}
