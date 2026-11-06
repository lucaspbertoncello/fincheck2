import { Button } from '#/components/buttons/button.component.tsx';
import { ArchivedCategoryRow } from '#/components/categories/archived-category-row.component.tsx';
import { CategoryRow } from '#/components/categories/category-row.component.tsx';
import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { PlusMark } from '#/components/categories/plus-mark.component.tsx';
import { sortCategories } from '#/components/categories/sort-categories.util.ts';
import { cx } from '#/utils/class-names.util.ts';

type CategoryListProps = {
  categories: ManagedCategory[];
  /** Accessible name of the list ("Categorias de despesa"). */
  label: string;
  /** The "Editar" of the menu: opens the editor. */
  onEdit: (id: string) => void;
  /** Click on the name or the row: opens the category page. Without it the name edits, as before. */
  onOpen?: (id: string) => void;
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
 * Category management list (components.md 15) of standard rows (10.0): alphabetical, no money.
 * Active rows carry the transaction count at the right end, rules and last use as the detail and the
 * "…" menu (the name opens the category page); archived rows are dashed, dimmed, with "Desarquivar"
 * on the strip. The last row is "Nova categoria" in the accent color.
 */
export function CategoryList({
  categories,
  label,
  onEdit,
  onOpen,
  onArchive,
  onRestore,
  onCreate,
  createLabel = 'Nova categoria',
  emptyMessage = 'Nenhuma categoria com esse nome.',
  className,
}: CategoryListProps) {
  const sorted = sortCategories(categories);

  return (
    <div className={cx('flex flex-col', className)}>
      {sorted.length === 0 ? (
        <p role="status" className="border-b border-line py-s24 text-body text-fg-secondary">
          {emptyMessage}
        </p>
      ) : (
        <ul aria-label={label} className="flex flex-col divide-y divide-line border-b border-line">
          {sorted.map((category) =>
            category.archived ? (
              <ArchivedCategoryRow key={category.id} category={category} onRestore={onRestore} />
            ) : (
              <CategoryRow
                key={category.id}
                category={category}
                onEdit={onEdit}
                onOpen={onOpen}
                onArchive={onArchive}
              />
            ),
          )}
        </ul>
      )}
      {onCreate ? (
        <Button variant="tertiary" onPress={onCreate} className="gap-s12 self-start pl-s4">
          <PlusMark />
          {createLabel}
        </Button>
      ) : null}
    </div>
  );
}
