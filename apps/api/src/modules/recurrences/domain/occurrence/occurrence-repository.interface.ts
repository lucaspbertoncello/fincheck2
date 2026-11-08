import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The port to the store of occurrences: the root with its payments. `Executor` is the database
// handle: pass the one of a unit of work to read and write inside it.
export interface OccurrenceRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Occurrence | null>;
  findByIds(ids: string[], executor?: Executor): Promise<Occurrence[]>;
  // The occurrences of the months, of any recurrence.
  findByMonths(months: Month[], executor?: Executor): Promise<Occurrence[]>;
  // Of the recurrences, in all months or only in `months`.
  findByRecurrenceIds(
    recurrenceIds: string[],
    months?: Month[],
    executor?: Executor,
  ): Promise<Occurrence[]>;
  // The most recent ones of a recurrence up to a month (inclusive), newest first.
  findRecentByRecurrence(
    recurrenceId: string,
    upToMonth: Month,
    limit: number,
    executor?: Executor,
  ): Promise<Occurrence[]>;
  // From `since` up to the month before `before`, of recurrences neither paused nor deleted, with no
  // manual mark: the ones that may still ask for an action.
  findPendingBefore(
    range: { since: Month; before: Month },
    executor?: Executor,
  ): Promise<Occurrence[]>;
  // Of recurrences that generate occurrences (neither paused nor archived), with no manual mark, and
  // a window that has begun by `date`: the raw material of the automatic match.
  findOpenForMatching(date: string, executor?: Executor): Promise<Occurrence[]>;
  // `recurrenceId|YYYY-MM` of the occurrences that exist in the months.
  findExistingKeys(months: Month[], executor?: Executor): Promise<Set<string>>;
  // Which of the transactions already settle an occurrence.
  findLinkedTransactionIds(transactionIds: string[], executor?: Executor): Promise<Set<string>>;
  // The same, only when the occurrence belongs to a recurrence that is not deleted: a link to a
  // deleted one is history and does not hold the transaction.
  findLiveLinkedTransactionIds(transactionIds: string[], executor?: Executor): Promise<Set<string>>;
  // The occurrences that hold a payment of any of the transactions.
  findByLinkedTransactionIds(transactionIds: string[], executor?: Executor): Promise<Occurrence[]>;
  // Inserts the ones that do not exist yet (recurrence and month are unique): generating again
  // never duplicates. Answers how many were new.
  insertMissing(occurrences: Occurrence[], executor?: Executor): Promise<number>;
  // Creates or updates the occurrence, replacing its payments.
  save(occurrence: Occurrence, executor?: Executor): Promise<void>;
  deleteByIds(ids: string[], executor?: Executor): Promise<void>;
}
