import type { z } from 'zod';

import type {
  getTimelineQuerySchema,
  timelineDaySchema,
  timelineDtoSchema,
  timelineItemDtoSchema,
} from './timeline.schema.ts';

export namespace Timeline {
  export type Dto = z.infer<typeof timelineDtoSchema>;
  export type Item = z.infer<typeof timelineItemDtoSchema>;
  export type Day = z.infer<typeof timelineDaySchema>;
  export type Query = z.infer<typeof getTimelineQuerySchema>;
}
