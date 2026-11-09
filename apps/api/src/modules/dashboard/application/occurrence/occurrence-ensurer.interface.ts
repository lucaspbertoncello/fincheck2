// Port that creates the occurrences that are missing (the current month and the 3 after it), which
// the reads of `dashboard` that depend on them call first: the queries never write. Idempotent.
// The owner is `recurrences` (`EnsureOccurrencesUseCase`).
export interface OccurrenceEnsurer {
  execute(): Promise<void>;
}
