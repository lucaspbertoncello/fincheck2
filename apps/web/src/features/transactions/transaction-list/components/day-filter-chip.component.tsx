import { Icon } from '@fincheck/ui';
import { Button } from 'react-aria-components';

import type { DayFilterView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type DayFilterChipProps = {
  filter: DayFilterView;
};

/** "Dia 12/10 ✕": the list is narrowed to one day (from the spend map); the chip is the way back to the month. */
export function DayFilterChip({ filter }: DayFilterChipProps) {
  return (
    <div>
      <Button
        onPress={filter.onClear}
        aria-label={`${filter.label}. Mostrar o mês todo`}
        className="focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s8 rounded-capsule border border-brand bg-brand-weak pr-s8 pl-s16 text-label whitespace-nowrap text-brand tabular-nums data-[hovered]:brightness-95"
      >
        {filter.label}
        <span aria-hidden="true" className="grid size-ctl-sm place-items-center">
          <Icon name="close" size="xs" />
        </span>
      </Button>
    </div>
  );
}
