import type { CategoryFilterKey } from '#/components/categories/category-filter-key.type.ts';
import { SearchField } from '#/components/forms/search-field.component.tsx';
import { SegmentedControl } from '#/components/forms/segmented-control.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type CategoryFilterProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CategoryFilterKey;
  onFilterChange: (filter: CategoryFilterKey) => void;
  counts: Record<CategoryFilterKey, number>;
  className?: string;
};

/**
 * Search and filter of the category list (components.md 15): 44 px search pill and the segmented
 * control "Despesas 12 | Receitas 5 | Arquivadas 2". Side by side on the desktop, stacked on the phone.
 */
export function CategoryFilter({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cx('flex flex-col gap-s12 lg:flex-row lg:items-center', className)}>
      <SearchField
        label="Buscar categoria"
        clearLabel="Limpar busca"
        value={search}
        onChange={onSearchChange}
        className="lg:flex-1"
      />
      <SegmentedControl
        label="Tipo de categoria"
        value={filter}
        onChange={(key) => onFilterChange(key as CategoryFilterKey)}
        options={[
          { key: 'expense', label: `Despesas ${counts.expense}` },
          { key: 'income', label: `Receitas ${counts.income}` },
          { key: 'archived', label: `Arquivadas ${counts.archived}` },
        ]}
      />
    </div>
  );
}
