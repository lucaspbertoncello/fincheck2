import { Button, Chip, Collapse } from '@fincheck/ui';

import type { RecurrenceFilterView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type RecurrenceFilterChipProps = {
  /** Null while the list is not narrowed to what pays a recurrence. */
  filter: RecurrenceFilterView | null;
};

/**
 * "Só vinculadas a recorrências" with "Limpar filtro": the state of `?recurrence=linked`, opened and
 * closed with the filter. It sits in the 24 px column of the screen, so the box cancels that gap
 * while closed.
 */
export function RecurrenceFilterChip({ filter }: RecurrenceFilterChipProps) {
  return (
    <Collapse isOpen={filter !== null} trackClassName="-mt-s24" contentClassName="pt-s24">
      {filter ? (
        <div className="flex flex-wrap items-center gap-s8">
          <Chip tone="accent" large>
            Só vinculadas a recorrências
          </Chip>
          <Button variant="tertiary" size="sm" onPress={filter.onClear}>
            Limpar filtro
          </Button>
        </div>
      ) : null}
    </Collapse>
  );
}
