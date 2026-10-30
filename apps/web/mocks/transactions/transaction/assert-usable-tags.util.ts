import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// New tags must exist and be active.
export function assertUsableTags(database: MockState.Database, tagIds: string[]): void {
  for (const tagId of tagIds) {
    if (findTag(database, tagId).archivedAt) fail(422, 'TRANSACTION_TAG_ARCHIVED', 'Tag arquivada');
  }
}
