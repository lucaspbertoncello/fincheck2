import type { ReactNode } from 'react';

import { Icon } from '#/components/icons/icon.component.tsx';
import { ListRow } from '#/components/list-row/index.ts';
import { Money } from '#/components/money/money.component.tsx';

type PanelListRowProps = {
  mark: ReactNode;
  name: string;
  subtitle: string;
  /** Paints the subtitle in the attention color with an alert icon. */
  warn?: boolean;
  cents: number;
};

/**
 * Row of the panel lists: the standard `ListRow` (mark, name, detail, tabular amount with the sign
 * column at the right) with the panel's tighter vertical padding so the panel keeps its size; no
 * divider between rows.
 */
export function PanelListRow({ mark, name, subtitle, warn = false, cents }: PanelListRowProps) {
  return (
    <ListRow
      className="py-s8! [@media(max-height:700px)]:py-s4!"
      mark={mark}
      name={name}
      detail={
        warn ? (
          <span className="inline-flex max-w-full items-center gap-s4 align-top text-caution">
            <Icon name="warning" size="xs" />
            <span className="truncate">{subtitle}</span>
          </span>
        ) : (
          subtitle
        )
      }
      detailTitle={subtitle}
      value={
        <Money cents={cents} sign="none" signColumn weight="plain" className="text-money-row" />
      }
    />
  );
}
