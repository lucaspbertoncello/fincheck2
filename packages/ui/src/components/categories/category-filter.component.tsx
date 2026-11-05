import type { CategoryFilterKey } from '#/components/categories/category-filter-key.type.ts';
import { ChoiceChip } from '#/components/chips/choice-chip.component.tsx';
import { SearchField } from '#/components/forms/search-field.component.tsx';
import { SegmentedControl } from '#/components/forms/segmented-control.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type CategoryFilterProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CategoryFilterKey;
  onFilterChange: (filter: CategoryFilterKey) => void;
  counts: Record<CategoryFilterKey, number>;
  /** False on the Tags part: the search is for categories. */
  showSearch?: boolean;
  className?: string;
};

/**
 * Search and filter of the category list (components.md 15): 44 px search pill and the segmented
 * control "Despesas 12 | Receitas 5 | Arquivadas 2 | Tags 5". Side by side on the desktop, stacked on the phone.
 */
export function CategoryFilter({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts,
  showSearch = true,
  className,
}: CategoryFilterProps) {
  const options: { key: CategoryFilterKey; label: string }[] = [
    { key: 'expense', label: `Despesas ${counts.expense}` },
    { key: 'income', label: `Receitas ${counts.income}` },
    { key: 'archived', label: `Arquivadas ${counts.archived}` },
    { key: 'tags', label: `Tags ${counts.tags}` },
  ];

  return (
    <div className={cx('flex flex-col gap-s12 lg:flex-row lg:items-center', className)}>
      {showSearch ? (
        <SearchField
          label="Buscar categoria"
          clearLabel="Limpar busca"
          value={search}
          onChange={onSearchChange}
          className="lg:flex-1"
        />
      ) : (
        <div className="max-lg:hidden lg:flex-1" />
      )}
      {/* Under 480 px four labels do not fit a segmented control: chips, one line each. */}
      <div className="max-[479px]:hidden">
        <SegmentedControl
          label="Tipo de categoria"
          value={filter}
          onChange={(key) => onFilterChange(key as CategoryFilterKey)}
          options={options}
        />
      </div>
      <div
        role="group"
        aria-label="Tipo de categoria"
        className="flex flex-wrap gap-s8 min-[480px]:hidden"
      >
        {options.map((option) => (
          <ChoiceChip
            key={option.key}
            selected={filter === option.key}
            onChange={() => onFilterChange(option.key)}
          >
            {option.label}
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}
