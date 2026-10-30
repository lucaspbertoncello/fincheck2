import type { z } from 'zod';

import type {
  agendaDtoSchema,
  agendaItemDtoSchema,
  getAgendaQuerySchema,
} from './agenda.schema.ts';

export namespace Agenda {
  export type Item = z.infer<typeof agendaItemDtoSchema>;
  export type Dto = z.infer<typeof agendaDtoSchema>;
  export type Query = z.infer<typeof getAgendaQuerySchema>;
}
