import { Button } from '#/components/buttons/button.component.tsx';
import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';
import { ListRow } from '#/components/list-row/index.ts';

type ArchivedCategoryRowProps = {
  category: ManagedCategory;
  onRestore: (id: string) => void;
};

/**
 * Row of an archived category on the standard list row: dashed icon, the name dimmed, the note
 * ("Despesa · 27 transações · usada até maio") as the detail and "Desarquivar" on the strip.
 */
export function ArchivedCategoryRow({ category, onRestore }: ArchivedCategoryRowProps) {
  return (
    <ListRow
      mark={<CategoryIcon icon={category.icon} dashed />}
      name={category.name}
      nameClassName="text-fg-secondary"
      detail={category.archivedNote}
      detailTitle={category.archivedNote}
      actions={
        <Button variant="secondary" size="sm" onPress={() => onRestore(category.id)}>
          Desarquivar
        </Button>
      }
    />
  );
}
