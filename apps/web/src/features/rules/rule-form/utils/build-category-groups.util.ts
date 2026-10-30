import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryOption } from '@fincheck/ui';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import type { CategoryGroup } from '#/features/rules/rule-form/types/rule-form.type.ts';

function toOption(category: Category.Dto): CategoryOption {
  return { id: category.id, name: category.name, icon: mapCategoryIcon(category.icon) };
}

type Options = {
  /** The type of the rule, when it has one: the picker then offers only that type. */
  kind: Category.Kind | null;
  /** The category already on the rule; shown even when it was archived since. */
  selectedId: string | null;
};

/**
 * The categories the picker offers: the active ones, grouped by type. An archived category that the
 * rule already points to gets its own group, so the sentence can still name it (a new rule cannot
 * pick an archived one).
 */
export function buildCategoryGroups(
  categories: readonly Category.Dto[],
  { kind, selectedId }: Options,
): CategoryGroup[] {
  const active = categories.filter(
    (category) => category.archivedAt === null && (!kind || category.kind === kind),
  );
  const groups: CategoryGroup[] = [
    { label: 'Despesas', options: active.filter((c) => c.kind === 'expense').map(toOption) },
    { label: 'Receitas', options: active.filter((c) => c.kind === 'income').map(toOption) },
  ].filter((group) => group.options.length > 0);

  const archived = categories.find(
    (category) => category.id === selectedId && category.archivedAt !== null,
  );
  if (archived) groups.push({ label: 'Arquivada', options: [toOption(archived)] });

  return groups;
}
