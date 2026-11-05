import type { z } from 'zod';

import type {
  profileDtoSchema,
  profileHighlightsDtoSchema,
  profileIncomeSourceSchema,
  profilePixHighlightSchema,
  updateProfileRequestSchema,
} from './profile.schema.ts';

export namespace Profile {
  export type Dto = z.infer<typeof profileDtoSchema>;
  export type IncomeSource = z.infer<typeof profileIncomeSourceSchema>;
  export type Highlights = z.infer<typeof profileHighlightsDtoSchema>;
  export type PixHighlight = z.infer<typeof profilePixHighlightSchema>;
  export type UpdateRequest = z.infer<typeof updateProfileRequestSchema>;
}
