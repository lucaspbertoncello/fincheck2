import type { ReactNode } from 'react';

import { ListRow } from '#/components/list-row/index.ts';
import { Money } from '#/components/money/money.component.tsx';

type PanelListRowProps = {
  mark: ReactNode;
  name: string;
  cents: number;
};

/**
 * Row of the panel lists: the standard `ListRow` (mark, name, tabular amount with the sign column
 * at the right) with the panel's tighter vertical padding so the panel keeps its size; no divider
 * between rows. Only icon, name and value: no detail line and no warning (Polimento 13, item 4).
 */
export function PanelListRow({ mark, name, cents }: PanelListRowProps) {
  return (
    <ListRow
      // One-line row: name and value center on the 36 px mark (the row's baseline alignment is for
      // rows with a detail line).
      className="py-s8! [&>:nth-child(n+2)]:self-center [@media(max-height:700px)]:py-s4!"
      mark={mark}
      name={name}
      value={
        <Money cents={cents} sign="none" signColumn weight="plain" className="text-money-row" />
      }
    />
  );
}
