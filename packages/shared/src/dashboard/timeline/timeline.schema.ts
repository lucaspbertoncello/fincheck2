import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';
import { agendaSourceSchema } from '../agenda/agenda.schema.ts';

export const timelineItemDtoSchema = z.object({
  key: z.string(),
  source: agendaSourceSchema,
  flow: z.enum(['in', 'out']),
  title: z.string(),
  amountCents: centsSchema,
  state: z.enum(['happened', 'expected', 'partial', 'late']),
  date: businessDateSchema.nullable(),
});

export const timelineDaySchema = z.object({
  date: businessDateSchema,
  isPast: z.boolean(),
  isToday: z.boolean(),
  projectedBalanceCents: centsSchema.nullable(),
  items: z.array(timelineItemDtoSchema),
});

export const timelineDtoSchema = z.object({
  month: monthSchema,
  today: businessDateSchema,
  days: z.array(timelineDaySchema),
  overdue: z.array(timelineItemDtoSchema),
  undated: z.array(timelineItemDtoSchema),
  endBalanceCents: centsSchema.nullable(),
});

export const getTimelineQuerySchema = z.object({
  month: monthSchema,
  scope: z.enum(['all', 'recurrences']).default('all'),
});
