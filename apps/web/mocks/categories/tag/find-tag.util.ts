import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

export function findTag(database: MockState.Database, id: string): MockState.TagRecord {
  return (
    database.tags.find((tag) => tag.id === id) ?? fail(404, 'TAG_NOT_FOUND', 'A tag não existe')
  );
}
