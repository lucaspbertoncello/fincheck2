/** Where an income source is created or edited: the recurrence modal of Recorrências, on Receitas. */
export function buildRecurrenceHref(recurrenceId?: string): string {
  return recurrenceId
    ? `/recurrences?edit=${recurrenceId}&flow=income`
    : '/recurrences?new=recurrence&flow=income';
}
