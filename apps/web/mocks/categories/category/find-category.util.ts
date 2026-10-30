import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

export function findCategory(database: MockState.Database, id: string): MockState.CategoryRecord {
  return (
    database.categories.find((category) => category.id === id) ??
    fail(404, 'CATEGORY_NOT_FOUND', 'A categoria não existe')
  );
}
