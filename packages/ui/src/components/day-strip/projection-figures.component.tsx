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
  /** "columns": three side by side (the day). "rows": the week card, balance as the main number. */
  layout: FiguresLayout;
  /** Money size class of the numbers. */
  className?: string;
};

type FigureProps = {
  label: string;
  children: ReactNode;
};

function Figure({ label, children }: FigureProps) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-s8 @min-[30rem]:flex-col @min-[30rem]:flex-nowrap @min-[30rem]:justify-start @min-[30rem]:gap-s4">
      <span className="text-meta whitespace-nowrap text-fg-secondary">{label}</span>
      {children}
    </span>
  );
}

/** A flow of a week card: "Entra" / "Sai" with sign and color; zero is a discreet dash. */
function FlowRow({ label, cents, flow }: { label: string; cents: number; flow: 'in' | 'out' }) {
  return (
    <span className="flex min-w-0 items-baseline justify-between gap-s8">
      <span className="text-label whitespace-nowrap text-fg-secondary">{label}</span>
      {cents > 0 ? (
        <Money
          cents={cents}
          sign={flow === 'in' ? 'plus' : 'minus'}
          tone={flow === 'in' ? 'income' : 'expense'}
          weight="plain"
          className="text-label"
        />
      ) : (
        <span className="text-label text-fg-tertiary">
          <span aria-hidden="true">—</span>
          <span className="sr-only">nada</span>
        </span>
      )}
    </span>
  );
}

/**
 * What comes in, what goes out and the projected balance. Made of spans so it can live inside a
 * button (the week card). Two layouts:
 *
 * - "columns" (the day slider): three figures in a row from 480 px of box and three label/value
 *   lines below that, so a 5-digit value never overlaps or cuts. Zero reads faded; a negative
 *   balance reads red.
 * - "rows" (the week card, Polimento 13): the balance is the main number (label above, money size
 *   from `className`), then "Entra" and "Sai" small under a rule, with sign and color; a zero flow
 *   is a discreet "—".
 */
export function ProjectionFigures({
  inCents,
  outCents,
  balanceCents,
  balanceLabel,
  layout,
  className = 'text-money-md',
}: ProjectionFiguresProps) {
  const balanceTone = cx(
    balanceCents !== undefined && balanceCents < 0 ? 'text-loss' : 'text-fg-primary',
  );

  if (layout === 'rows') {
    return (
      <span className="flex min-w-0 flex-col gap-s12">
        {balanceCents === undefined ? null : (
          <span className="flex min-w-0 flex-col gap-s4">
            <span className="text-label whitespace-nowrap text-fg-secondary">{balanceLabel}</span>
            <Money
              cents={balanceCents}
              sign="auto"
              weight="emphasis"
              className={cx(className, balanceTone)}
            />
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-s4 border-t border-line pt-s12">
          <FlowRow label="Entra" cents={inCents} flow="in" />
          <FlowRow label="Sai" cents={outCents} flow="out" />
        </span>
      </span>
    );
  }

  // Below 480 px (a phone) the day lines step down one money size, so "R$ 88.888,88" fits beside its label.
  const size = cx(className, 'shrink-0 @max-[30rem]:text-money-sm');
  return (
    <span className="@container block min-w-0">
      <span className="grid min-w-0 grid-cols-1 gap-s8 @min-[30rem]:grid-cols-3 @min-[30rem]:gap-s12">
        <Figure label="Entra">
          <Money
            cents={inCents}
            sign={inCents > 0 ? 'plus' : 'none'}
            tone={inCents > 0 ? 'income' : 'faded'}
            weight="plain"
            className={size}
          />
        </Figure>
        <Figure label="Sai">
          <Money
            cents={outCents}
            sign={outCents > 0 ? 'minus' : 'none'}
            tone={outCents > 0 ? 'expense' : 'faded'}
            weight="plain"
            className={size}
          />
        </Figure>
        {balanceCents === undefined ? null : (
          <Figure label={balanceLabel}>
            <Money
              cents={balanceCents}
              sign="auto"
              weight="emphasis"
              className={cx(size, balanceTone)}
            />
          </Figure>
        )}
      </span>
    </span>
  );
}
