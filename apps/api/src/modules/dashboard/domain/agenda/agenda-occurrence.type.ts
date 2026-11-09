import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

// An occurrence of a recurrence with what its recurrence adds: the sender and the category.
export type AgendaOccurrence = Occurrence.Dto & {
  counterparty: string | null;
  categoryId: string | null;
  // The recurrence is paused: what is left of the occurrence is no longer expected.
  recurrencePaused: boolean;
};
