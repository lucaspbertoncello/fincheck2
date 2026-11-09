import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';

// Port to the occurrences (months are `YYYY-MM`). The owner is `recurrences`. It only reads:
// `OccurrenceEnsurer` creates the missing ones first.
export interface AgendaOccurrenceReader {
  // The ones of the month and, when it is the current one, the late ones that came along from the
  // last 3 months (`carriedOver`).
  listOfMonth(month: string): Promise<AgendaOccurrence[]>;
  // The open ones of the month before and of the month after `month`, of a recurrence that is
  // neither paused nor deleted, with a day on or before the last day of `month`: what the Livre of
  // that month still owes or is owed even though the occurrence belongs to another one.
  listOpenDueBy(month: string): Promise<AgendaOccurrence[]>;
  // The confirmed ones of the 3 months before and of the month after `month`: some of them were
  // paid in it.
  listSettledAround(month: string): Promise<AgendaOccurrence[]>;
}
