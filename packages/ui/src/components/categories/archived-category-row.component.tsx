import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { Button } from '#/components/buttons/button.component.tsx';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';

type ArchivedCategoryRowProps = {
  category: ManagedCategory;
  onRestore: (id: string) => void;
};

/** Row of an archived category: dashed icon, name in 400 and secondary, the note and "Restaurar". */
export function ArchivedCategoryRow({ category, onRestore }: ArchivedCategoryRowProps) {
  return (
    <li
      role="row"
      className="flex items-center gap-s12 border-b border-line py-s12 transition-colors duration-(--duration-fast) hover:bg-linear-to-r hover:from-subtle hover:to-transparent"
    >
      <div role="cell">
        <CategoryIcon icon={category.icon} dashed />
      </div>
      <div role="cell" className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-plain text-fg-secondary">{category.name}</span>
        {category.archivedNote ? (
          <span className="text-meta text-fg-secondary">{category.archivedNote}</span>
        ) : null}
      </div>
      <div role="cell">
        <Button variant="secondary" size="sm" onPress={() => onRestore(category.id)}>
          Restaurar
        </Button>
      </div>
    </li>
  );
}
