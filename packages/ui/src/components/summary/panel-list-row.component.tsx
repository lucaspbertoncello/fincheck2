import type { ReactNode } from 'react';

import { Icon } from '#/components/icons/icon.component.tsx';
import { Money } from '#/components/money/money.component.tsx';

type PanelListRowProps = {
  mark: ReactNode;
  name: string;
  subtitle: string;
  /** Paints the subtitle in the attention color with an alert icon. */
  warn?: boolean;
  cents: number;
};

/** Row of the panel lists: mark, name, subtitle and the amount at the right (components.md 2.3). */
export function PanelListRow({ mark, name, subtitle, warn = false, cents }: PanelListRowProps) {
  return (
    <li className="flex items-center gap-s12 border-t border-line py-s12 first:border-t-0">
      {mark}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-list font-emphasis text-fg-primary">{name}</span>
        <span
          className={`flex items-center gap-s4 text-meta ${warn ? 'text-caution' : 'text-fg-secondary'}`}
        >
          {warn ? <Icon name="warning" size="xs" /> : null}
          {subtitle}
        </span>
      </span>
      <Money cents={cents} sign="none" weight="plain" className="text-body" />
    </li>
  );
}
