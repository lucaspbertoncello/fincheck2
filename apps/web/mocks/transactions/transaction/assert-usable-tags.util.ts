import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// The tags a transaction (or a plan) may take: they exist, belong to ITS category (a split one: a category of its
// parts; with no category there is no tag) and the new ones are active. Same order of errors as the API: not found, no
// category, other category, archived. `alreadyThere` are the tags it has now: an archived one may stay.
export function assertUsableTags(
  database: MockState.Database,
  tagIds: string[],
  categoryIds: readonly string[],
  alreadyThere: readonly string[] = [],
): void {
  const tags = tagIds.map((tagId) => findTag(database, tagId));
  if (tags.length > 0 && categoryIds.length === 0) {
    fail(422, 'TRANSACTION_TAG_NEEDS_CATEGORY', 'Escolha a categoria antes de usar tags');
  }
  for (const tag of tags) {
    if (!categoryIds.includes(tag.categoryId)) {
      fail(
        422,
        'TRANSACTION_TAG_CATEGORY_MISMATCH',
        'Uma das tags não é da categoria da transação',
      );
    }
    if (tag.archivedAt && !alreadyThere.includes(tag.id)) {
      fail(422, 'TRANSACTION_TAG_ARCHIVED', 'Tag arquivada');
    }
  }
}
