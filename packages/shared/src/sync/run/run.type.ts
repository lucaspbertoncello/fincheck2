import type { z } from 'zod';

import type {
  runDtoSchema,
  runStatusSchema,
  runSummaryDtoSchema,
  runTriggerSchema,
} from './run.schema.ts';

export namespace Run {
  export type Dto = z.infer<typeof runDtoSchema>;
  export type Summary = z.infer<typeof runSummaryDtoSchema>;
  export type Trigger = z.infer<typeof runTriggerSchema>;
  export type Status = z.infer<typeof runStatusSchema>;
}
