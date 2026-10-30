import type { ReactNode } from 'react';

import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type FiguresLayout = 'columns' | 'rows';

type ProjectionFiguresProps = {
  inCents: number;
  outCents: number;
  /** Projected balance; absent when the API gave none. */
  balanceCents?: number;
  /** "Saldo projetado" for a day, "Saldo ao fim da semana" for a week. */
  balanceLabel: string;
  /** "columns": three side by side (the day). "rows": label and value per line (a week card). */
  layout: FiguresLayout;
  /** Money size class of the numbers. */
  className?: string;
};

type FigureProps = {
  label: string;
  layout: FiguresLayout;
  children: ReactNode;
};

function Figure({ label, layout, children }: FigureProps) {
  return (
    <span
      className={cx(
        'min-w-0',
        layout === 'columns'
          ? 'flex flex-col gap-s4'
          : 'flex flex-wrap items-baseline justify-between gap-x-s8',
      )}
    >
      <span className="text-meta text-fg-secondary">{label}</span>
      {children}
    </span>
  );
}

/**
 * What comes in, what goes out and the projected balance, in that order. Made of spans so it can
 * live inside a button (the week card). Zero reads faded, a negative balance reads red.
 */
export function ProjectionFigures({
  inCents,
  outCents,
  balanceCents,
  balanceLabel,
  layout,
  className = 'text-money-md',
}: ProjectionFiguresProps) {
  return (
    <span
      className={cx(
        'min-w-0',
        layout === 'columns' ? 'grid grid-cols-3 gap-s12' : 'flex flex-col gap-s8',
      )}
    >
      <Figure label="Entra" layout={layout}>
        <Money
          cents={inCents}
          sign={inCents > 0 ? 'plus' : 'none'}
          tone={inCents > 0 ? 'income' : 'faded'}
          weight="plain"
          className={className}
        />
      </Figure>
      <Figure label="Sai" layout={layout}>
        <Money
          cents={outCents}
          sign={outCents > 0 ? 'minus' : 'none'}
          tone={outCents > 0 ? 'inherit' : 'faded'}
          weight="plain"
          className={cx(className, outCents > 0 && 'text-fg-primary')}
        />
      </Figure>
      {balanceCents === undefined ? null : (
        <Figure label={balanceLabel} layout={layout}>
          <Money
            cents={balanceCents}
            sign="auto"
            weight="emphasis"
            className={cx(className, balanceCents < 0 ? 'text-loss' : 'text-fg-primary')}
          />
        </Figure>
      )}
    </span>
  );
}
