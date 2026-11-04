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
          ? 'flex flex-wrap items-baseline justify-between gap-x-s8 @min-[30rem]:flex-col @min-[30rem]:flex-nowrap @min-[30rem]:justify-start @min-[30rem]:gap-s4'
          : 'flex flex-wrap items-baseline justify-between gap-x-s8',
      )}
    >
      <span className="text-meta whitespace-nowrap text-fg-secondary">{label}</span>
      {children}
    </span>
  );
}

/**
 * What comes in, what goes out and the projected balance, in that order. Made of spans so it can
 * live inside a button (the week card). Zero reads faded, a negative balance reads red. The day
 * layout is three columns when its box is 480 px wide or more and three label/value lines below
 * that (a phone), so a 5-digit value never overlaps or cuts.
 */
export function ProjectionFigures({
  inCents,
  outCents,
  balanceCents,
  balanceLabel,
  layout,
  className = 'text-money-md',
}: ProjectionFiguresProps) {
  // Below 480 px (a phone) the day lines step down one money size, so "R$ 88.888,88" fits beside its label.
  const size = cx(className, layout === 'columns' && 'shrink-0 @max-[30rem]:text-money-sm');
  return (
    <span className={cx('min-w-0', layout === 'columns' && '@container block')}>
      <span
        className={cx(
          'min-w-0',
          layout === 'columns'
            ? 'grid grid-cols-1 gap-s8 @min-[30rem]:grid-cols-3 @min-[30rem]:gap-s12'
            : 'flex flex-col gap-s8',
        )}
      >
        <Figure label="Entra" layout={layout}>
          <Money
            cents={inCents}
            sign={inCents > 0 ? 'plus' : 'none'}
            tone={inCents > 0 ? 'income' : 'faded'}
            weight="plain"
            className={size}
          />
        </Figure>
        <Figure label="Sai" layout={layout}>
          <Money
            cents={outCents}
            sign={outCents > 0 ? 'minus' : 'none'}
            tone={outCents > 0 ? 'inherit' : 'faded'}
            weight="plain"
            className={cx(size, outCents > 0 && 'text-fg-primary')}
          />
        </Figure>
        {balanceCents === undefined ? null : (
          <Figure label={balanceLabel} layout={layout}>
            <Money
              cents={balanceCents}
              sign="auto"
              weight="emphasis"
              className={cx(size, balanceCents < 0 ? 'text-loss' : 'text-fg-primary')}
            />
          </Figure>
        )}
      </span>
    </span>
  );
}
