/** Where an income source is created or edited: the recurrence modal of Recorrências. */
export function buildRecurrenceHref(recurrenceId?: string): string {
  return recurrenceId ? `/recurrences?edit=${recurrenceId}` : '/recurrences?new=recurrence';
}
