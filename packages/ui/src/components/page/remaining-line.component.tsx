import type { ReactNode } from 'react';

import { Money } from '#/components/money/money.component.tsx';
import { Skeleton } from '#/components/states/skeleton.component.tsx';
import type { RemainingLineData } from '#/components/page/remaining-line.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type RemainingLineProps = {
  /** Without data the strip shows a skeleton of the same height. */
  data?: RemainingLineData;
  className?: string;
};

type CellProps = {
  label: string;
  children: ReactNode;
};

/** Label over the figure on the phone; label then figure on one line from the desktop. */
function Cell({ label, children }: CellProps) {
  return (
    <div className="flex min-w-fit flex-1 flex-col items-start gap-s4 px-s12 py-s8 lg:flex-none lg:flex-row lg:items-baseline lg:gap-s8 lg:px-s16">
      <dt className="text-meta whitespace-nowrap text-fg-secondary">{label}</dt>
      <dd className="m-0 text-label font-emphasis whitespace-nowrap text-fg-primary">{children}</dd>
    </div>
  );
}

/**
 * "Faltam 10 dias · ainda entram · ainda saem" as a strip of three cells (components.md 1.4,
 * Polimento 13): what is left in the month, what still comes in (green, "+") and what still goes
 * out (red, "−"). On the phone it is a full-width bar of three equal cells with the label above the
 * figure; from the desktop it is a compact bar on the right of the date row. A cell never breaks
 * inside; if the figures are too wide for one row the cells drop to the next line.
 */
export function RemainingLine({ data, className }: RemainingLineProps) {
  if (!data) {
    return <Skeleton className="h-14 w-full rounded-panel lg:h-10 lg:w-96" />;
  }
  const { daysLeft, incomeCents, expenseCents } = data;

  return (
    <dl
      aria-label="O que falta no mês"
      className={cx(
        'm-0 flex flex-wrap overflow-hidden rounded-panel border border-line bg-glass lg:inline-flex lg:flex-nowrap',
        '*:not-first:border-l *:not-first:border-line',
        className,
      )}
    >
      <Cell label="Faltam">
        {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
      </Cell>
      <Cell label="Ainda entram">
        <Money
          cents={incomeCents}
          sign={incomeCents > 0 ? 'plus' : 'none'}
          tone={incomeCents > 0 ? 'income' : 'faded'}
          weight="emphasis"
        />
      </Cell>
      <Cell label="Ainda saem">
        <Money
          cents={expenseCents}
          sign={expenseCents > 0 ? 'minus' : 'none'}
          tone={expenseCents > 0 ? 'expense' : 'faded'}
          weight="emphasis"
        />
      </Cell>
    </dl>
  );
}
