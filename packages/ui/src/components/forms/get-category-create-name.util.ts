import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { foldText } from '#/utils/fold-text.util.ts';

/**
 * The name a "Criar categoria" line would create: the typed text, trimmed, when it is not already
 * the name of a category (no difference for case or accent). Empty when nothing was typed or the
 * text IS a category, so the picker offers only the fixed "Nova categoria" line.
 */
export function getCategoryCreateName(
  categories: readonly CategoryOption[],
  typed: string,
): string {
  const wanted = foldText(typed);
  if (wanted === '') return '';

  return categories.some((category) => foldText(category.name) === wanted) ? '' : typed.trim();
}
