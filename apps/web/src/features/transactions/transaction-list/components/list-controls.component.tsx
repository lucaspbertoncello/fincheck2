import { Button, SearchField, SegmentedControl, SelectionToggle } from '@fincheck/ui';

import {
  TYPE_OPTIONS,
  VIEW_OPTIONS,
} from '#/features/transactions/transaction-list/constants/list-control-options.constant.ts';
import type {
  ListControlsView,
  ListTypeFilter,
  ListViewMode,
} from '#/shared/types/transactions/transaction-list-view.type.ts';

type ListControlsProps = {
  controls: ListControlsView;
};

/**
 * The controls over the list, in two tiers. First the main control, on its own row: Todas |
 * Despesas | Receitas (the direction of the money, with the tone of the new-transaction form),
 * full width on the phone and a fixed 28 rem on the desktop, so it never reads as one more filter.
 * Then the tools row: Lista | Por categoria, search, "Filtros" and "Selecionar" (phone, ui
 * adjustments 8 and 14: search with the two buttons, same width, 44 tall, then Lista | Por
 * categoria).
 */
export function ListControls({ controls }: ListControlsProps) {
  const showSelection = controls.view === 'list';

  return (
    <div className="flex flex-col gap-s16">
      <SegmentedControl
        direction
        label="Tipo de transação"
        options={TYPE_OPTIONS}
        value={controls.type}
        onChange={(key) => controls.onTypeChange(key as ListTypeFilter)}
        className="lg:w-[28rem]"
      />
      <div className="flex flex-col gap-s12 lg:flex-row lg:flex-wrap lg:items-center">
        <SegmentedControl
          label="Visão das transações"
          options={VIEW_OPTIONS}
          value={controls.view}
          onChange={(key) => controls.onViewChange(key as ListViewMode)}
          className="order-2 lg:order-1"
        />
        <div className="order-1 grid grid-cols-2 gap-s12 lg:order-2 lg:flex lg:min-w-60 lg:flex-1 lg:items-center lg:gap-s8">
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
              {controls.activeFilterCount > 0 ? (
                <span className="tabular-nums"> · {controls.activeFilterCount}</span>
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
    </div>
  );
}
