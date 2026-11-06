import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireWiredReader } from '#/modules/transactions/application/transaction/require-wired-reader.util.ts';
import type { TransactionCategoryReader } from '#/modules/transactions/application/transaction/transaction-category-reader.interface.ts';
import type { TransactionTagReader } from '#/modules/transactions/application/transaction/transaction-tag-reader.interface.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';

// Resolves the category and the tags a request points to, through the ports of `categories`. A
// request with no category and no tag never touches them, so it works while that context is not
// wired; one that names a category or a tag then is refused with a 400 (see `requireWiredReader`).
export class TransactionReferenceResolver {
  private readonly categories: TransactionCategoryReader | undefined;
  private readonly tags: TransactionTagReader | undefined;

  constructor(
    categories: TransactionCategoryReader | undefined,
    tags: TransactionTagReader | undefined,
  ) {
    this.categories = categories;
    this.tags = tags;
  }

  // The category, or null when none is named.
  async category(
    categoryId: string | null | undefined,
    executor: Kysely<Database>,
  ): Promise<Transaction.CategoryRef | null> {
    if (categoryId === null || categoryId === undefined) return null;
    const found = await this.categoriesById([categoryId], executor);

    return found.get(categoryId) ?? null;
  }

  async categoriesById(
    categoryIds: string[],
    executor: Kysely<Database>,
  ): Promise<Map<string, Transaction.CategoryRef>> {
    if (categoryIds.length === 0) return new Map();

    return requireWiredReader(
      this.categories,
      'categoryId',
      'o contexto de categorias',
    ).requireCategories([...new Set(categoryIds)], executor);
  }

  async tagsById(tagIds: string[], executor: Kysely<Database>): Promise<Transaction.TagRef[]> {
    if (tagIds.length === 0) return [];

    return requireWiredReader(this.tags, 'tagIds', 'o contexto de categorias').requireTags(
      tagIds,
      executor,
    );
  }
}
