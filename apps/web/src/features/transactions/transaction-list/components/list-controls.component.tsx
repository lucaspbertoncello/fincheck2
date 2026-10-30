import { Button, SearchField, SegmentedControl, SelectionToggle } from '@fincheck/ui';

import {
  TYPE_OPTIONS,
  VIEW_OPTIONS,
} from '#/features/transactions/transaction-list/constants/list-control-options.constant.ts';
import type {
  ListControlsView,
  ListTypeFilter,
  ListViewMode,
} from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type ListControlsProps = {
  controls: ListControlsView;
};

/**
 * The controls over the list. Desktop, one row: Lista | Por categoria, Todas | Despesas | Receitas,
 * search, "Filtros" and "Selecionar". Phone (ui adjustments 8 and 14), two strips: search with the
 * "Filtros" and "Selecionar" buttons (same width, 44 tall, "Selecionar" with its text), then
 * Lista | Por categoria; the type filter lives inside "Filtros" there.
 */
export function ListControls({ controls }: ListControlsProps) {
  const phoneFilterCount = controls.activeFilterCount + (controls.typeActive ? 1 : 0);
  const showSelection = controls.view === 'list';

  return (
    <div className="flex flex-col gap-s12 lg:flex-row lg:flex-wrap lg:items-center">
      <SegmentedControl
        label="Visão das transações"
        options={VIEW_OPTIONS}
        value={controls.view}
        onChange={(key) => controls.onViewChange(key as ListViewMode)}
        className="order-2 lg:order-1"
      />
      <SegmentedControl
        label="Tipo de transação"
        options={TYPE_OPTIONS}
        value={controls.type}
        onChange={(key) => controls.onTypeChange(key as ListTypeFilter)}
        className="order-3 hidden lg:order-2 lg:inline-flex"
      />
      <div className="order-1 grid grid-cols-2 gap-s12 lg:order-3 lg:flex lg:min-w-60 lg:flex-1 lg:items-center lg:gap-s8">
        <SearchField
          label="Buscar"
          value={controls.searchText}
          onChange={controls.onSearchTextChange}
          className="col-span-2 lg:flex-1"
        />
        <Button
          variant="secondary"
          icon="filter"
          onPress={controls.onOpenFilters}
          fullWidth
          // Desktop: icon only, like the design; the label stays for screen readers.
          className={[
            showSelection ? '' : 'col-span-2 lg:col-auto',
            'lg:w-ctl-touch lg:px-0',
            controls.activeFilterCount > 0 ? 'lg:border-brand lg:text-brand' : '',
          ].join(' ')}
        >
          <span className="lg:sr-only">
            Filtros
            {phoneFilterCount > 0 ? (
              <span className="tabular-nums lg:hidden"> · {phoneFilterCount}</span>
            ) : null}
            {controls.activeFilterCount > 0 ? (
              <span className="hidden tabular-nums lg:inline"> · {controls.activeFilterCount}</span>
            ) : null}
          </span>
        </Button>
        {showSelection ? (
          <SelectionToggle
            active={controls.selectionActive}
            count={controls.selectionCount}
            onToggle={controls.onToggleSelection}
            className="w-full lg:w-auto"
          />
        ) : null}
      </div>
    </div>
  );
}
