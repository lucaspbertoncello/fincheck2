import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// A category a transaction may take: it exists, is active and has the kind of the transaction.
export function assertUsableCategory(
  database: MockState.Database,
  categoryId: string,
  kind: 'expense' | 'income',
): void {
  const category = findCategory(database, categoryId);
  if (category.archivedAt) fail(422, 'TRANSACTION_CATEGORY_ARCHIVED', 'Categoria arquivada');
  if (category.kind !== kind) {
    fail(422, 'TRANSACTION_CATEGORY_KIND_MISMATCH', 'Tipo da categoria diferente do da transação');
  }
}
