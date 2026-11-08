import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { RecurrenceNotFoundError } from '#/modules/recurrences/domain/recurrence/recurrence-not-found.error.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';

// The recurrence, or `RECURRENCE_NOT_FOUND`.
export async function requireRecurrence(
  recurrences: RecurrenceRepository<Kysely<Database>>,
  id: string,
  executor?: Kysely<Database>,
): Promise<Recurrence> {
  const recurrence = await recurrences.findById(id, executor);
  if (!recurrence) throw new RecurrenceNotFoundError();

  return recurrence;
}
