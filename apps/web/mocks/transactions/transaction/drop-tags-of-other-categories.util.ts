import type { MockState } from '#mocks/state/mock-state.type.ts';
import { getTaggableCategoryIds } from '#mocks/transactions/transaction/get-taggable-category-ids.util.ts';

// A transaction only has tags of its own category or, when split, of the categories of its parts
// (PM, 09/11/2026): when the category changes, or goes away, in any flow (an edit, a bulk action, a rule, a link, a bill, an invoice), the tags of
// the old one leave with it. The API does it in the same operation; the mock does it once the
// route is done, so no route has to remember.
export function dropTagsOfOtherCategories(database: MockState.Database): void {
  const categoryOfTag = new Map(database.tags.map((tag) => [tag.id, tag.categoryId]));
  for (const tx of database.transactions) {
    if (tx.tagIds.length === 0) continue;
    const categoryIds = getTaggableCategoryIds(tx);
    const kept = tx.tagIds.filter((tagId) => categoryIds.includes(categoryOfTag.get(tagId) ?? ''));
    if (kept.length !== tx.tagIds.length) tx.tagIds = kept;
  }
}
