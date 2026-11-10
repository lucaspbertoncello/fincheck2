import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Usada em 27 transações e 2 regras." or "Ainda sem uso.": what archiving would touch. */
export function describeCategoryUsage(
  category: Pick<Category.Dto, 'transactionCount' | 'ruleCount'>,
): string {
  const parts: string[] = [];
  if (category.transactionCount > 0) {
    parts.push(plural(category.transactionCount, 'transação', 'transações'));
  }
  if (category.ruleCount > 0) parts.push(plural(category.ruleCount, 'regra', 'regras'));

  return parts.length === 0 ? 'Ainda sem uso.' : `Usada em ${parts.join(' e ')}.`;
}
