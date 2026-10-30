import { Button } from 'react-aria-components';

import { ArchivedCategoryRow } from '#/components/categories/archived-category-row.component.tsx';
import { CATEGORY_COLUMNS_CLASS } from '#/components/categories/category-columns.constant.ts';
import { CategoryRow } from '#/components/categories/category-row.component.tsx';
import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { PlusMark } from '#/components/categories/plus-mark.component.tsx';
import { sortCategories } from '#/components/categories/sort-categories.util.ts';
import { cx } from '#/utils/class-names.util.ts';

type CategoryListProps = {
  categories: ManagedCategory[];
  /** Accessible name of the list ("Categorias de despesa"). */
  label: string;
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  /** Shows the "Nova categoria" row at the end when given. */
  onCreate?: () => void;
  createLabel?: string;
  /** Shown when the list is empty ("Nenhuma categoria com esse nome."). */
  emptyMessage?: string;
  className?: string;
};

/**
 * Category management list (components.md 15): alphabetical, no values. Active rows carry
 * transactions, rules and last use plus the "…" menu; archived rows are dashed, dimmed, with
 * "Restaurar". The last row is "Nova categoria" in the accent color. Header only on the desktop.
 */
export function CategoryList({
  categories,
  label,
  onEdit,
  onArchive,
  onRestore,
  onCreate,
  createLabel = 'Nova categoria',
  emptyMessage = 'Nenhuma categoria com esse nome.',
  className,
}: CategoryListProps) {
  const sorted = sortCategories(categories);
  const hasActive = sorted.some((category) => !category.archived);

  return (
    <div className={cx('flex flex-col', className)}>
      {sorted.length === 0 ? (
        <p role="status" className="border-b border-line py-s24 text-body text-fg-secondary">
          {emptyMessage}
        </p>
      ) : (
        <div role="table" aria-label={label}>
          {hasActive ? (
            <div
              role="row"
              className={cx(
                'border-b border-line pb-s8 text-meta text-fg-tertiary max-lg:flex',
                CATEGORY_COLUMNS_CLASS,
              )}
            >
              <span role="columnheader" className="lg:col-start-2">
                <span className="lg:hidden">De A a Z</span>
                <span className="max-lg:hidden">Categoria, de A a Z</span>
              </span>
              <span role="columnheader" className="text-right max-lg:hidden">
                Transações
              </span>
              <span role="columnheader" className="max-lg:hidden">
                Regras
              </span>
              <span role="columnheader" className="max-lg:hidden">
                Último uso
              </span>
              <span role="columnheader" className="sr-only">
                Ações
              </span>
            </div>
          ) : null}
          <ul role="rowgroup">
            {sorted.map((category) =>
              category.archived ? (
                <ArchivedCategoryRow key={category.id} category={category} onRestore={onRestore} />
              ) : (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={onEdit}
                  onArchive={onArchive}
                />
              ),
            )}
          </ul>
        </div>
      )}
      {onCreate ? (
        <Button
          onPress={onCreate}
          className="focus-ring flex min-h-ctl-touch w-fit cursor-pointer items-center gap-s12 rounded-capsule py-s12 pr-s16 text-body font-emphasis text-brand"
        >
          <PlusMark />
          {createLabel}
        </Button>
      ) : null}
    </div>
  );
}
