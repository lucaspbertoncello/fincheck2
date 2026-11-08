import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import { OccurrenceNotFoundError } from '#/modules/recurrences/domain/occurrence/occurrence-not-found.error.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';

// The occurrence, or `OCCURRENCE_NOT_FOUND`.
export async function requireOccurrence(
  occurrences: OccurrenceRepository<Kysely<Database>>,
  id: string,
  executor?: Kysely<Database>,
): Promise<Occurrence> {
  const occurrence = await occurrences.findById(id, executor);
  if (!occurrence) throw new OccurrenceNotFoundError();

  return occurrence;
}
