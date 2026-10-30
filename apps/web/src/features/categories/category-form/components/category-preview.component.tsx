import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { CategoryIcon } from '@fincheck/ui';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { CATEGORY_KIND_LABELS } from '#/features/categories/constants/category-kind-labels.constant.ts';

type CategoryPreviewProps = {
  name: string;
  icon: Category.Icon;
  kind: Category.Kind;
};

/**
 * The category as it will look in a transaction row: its icon with the type arrow, the name and the
 * type under it. Updates with every key; empty, it shows the hint in the tertiary tone.
 */
export function CategoryPreview({ name, icon, kind }: CategoryPreviewProps) {
  const trimmed = name.trim();

  return (
    <div
      role="img"
      aria-label={`Prévia: ${trimmed || 'categoria sem nome'}, ${CATEGORY_KIND_LABELS[kind]}`}
      className="flex items-center gap-s12 rounded-input bg-subtle p-s16"
    >
      <CategoryIcon icon={mapCategoryIcon(icon)} size="lg" type={kind} />
      <div className="flex min-w-0 flex-col">
        <span
          className={
            trimmed
              ? 'truncate text-body font-emphasis text-fg-primary'
              : 'truncate text-body text-fg-tertiary'
          }
        >
          {trimmed || 'Nome da categoria'}
        </span>
        <span className="text-meta text-fg-secondary">{CATEGORY_KIND_LABELS[kind]}</span>
      </div>
    </div>
  );
}
