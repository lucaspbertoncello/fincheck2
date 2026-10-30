import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type MonthSummaryCardsProps = {
  /** The three cards, in order: `IncomeSummaryCard`, `ExpenseSummaryCard`, `ResultSummaryCard`. */
  children: [ReactNode, ReactNode, ReactNode];
  /** Accessible name of the group ("Resumo do mês"). */
  label?: string;
  className?: string;
};

/**
 * Grid of the three summary cards (components.md 3.2). Desktop: three equal columns split by a
 * vertical rule, no box. Phone: a side strip that scrolls with snap, each card 80% wide.
 */
export function MonthSummaryCards({
  children,
  label = 'Resumo do mês',
  className,
}: MonthSummaryCardsProps) {
  return (
    <section
      aria-label={label}
      // Keyboard users scroll the strip with the arrows; on desktop nothing scrolls.
      tabIndex={0}
      className={cx(
        'focus-ring grid auto-cols-[80%] grid-flow-col gap-s12 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-none',
        'lg:auto-cols-fr lg:gap-0 lg:overflow-visible',
        className,
      )}
    >
      {children.map((card, index) => (
        <div
          key={index}
          className={cx(
            'relative flex snap-start',
            index > 0 &&
              'lg:before:absolute lg:before:inset-y-s16 lg:before:left-0 lg:before:w-px lg:before:bg-line lg:before:content-[""]',
          )}
        >
          {card}
        </div>
      ))}
    </section>
  );
}
