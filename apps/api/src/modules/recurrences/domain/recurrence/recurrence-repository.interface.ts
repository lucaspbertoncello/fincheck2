import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';

// The port to the store of recurrences. `Executor` is the database handle: pass the one of a unit
// of work to read and write inside it.
export interface RecurrenceRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Recurrence | null>;
  // The ones that exist, in no particular order.
  findByIds(ids: string[], executor?: Executor): Promise<Recurrence[]>;
  // Every recurrence, archived ones only when asked; `subscriptionsOnly` keeps the marked ones.
  findMany(
    filter: { includeArchived: boolean; subscriptionsOnly?: boolean },
    executor?: Executor,
  ): Promise<Recurrence[]>;
  // Neither paused nor archived: the ones that generate occurrences.
  findActive(executor?: Executor): Promise<Recurrence[]>;
  save(recurrence: Recurrence, executor?: Executor): Promise<void>;
}
