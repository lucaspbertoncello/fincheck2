import type { ReactNode } from 'react';

import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { MetricCard } from '#/components/summary/metric-card.component.tsx';

type MonthSummaryCardProps = {
  icon: IconName;
  label: string;
  /** Badge at the right of the header (percent, variation or delta); its row stays when absent. */
  badge?: ReactNode;
  /** Keeps the badge row, invisible, when there is no badge (for cards that sit on one row with cards that have one). */
  reserveBadge?: boolean;
  /** The big value: a `Money`. */
  value: ReactNode;
  /** Line under the value; up to 2 lines. */
  subtext: ReactNode;
  /** The `SummaryBar`. */
  bar: ReactNode;
  /** Legend under the bar ("Recebido do esperado"). */
  barLegend: string;
  /** Makes the whole card a link to where the number comes from (already filtered by the month). */
  href?: string;
  className?: string;
};

/**
 * Frame of the month summary cards (components.md 3.2): the shared `MetricCard` with the subtext as
 * its supporting lines (up to 2) and the bar with its legend at the bottom. With `reserveBadge` a card
 * with no badge (spending with nothing to compare) keeps the row, so the values and the lines of the
 * cards on its row stay on the same line; off by default, because a card alone gets no empty row.
 */
export function MonthSummaryCard({
  icon,
  label,
  badge,
  reserveBadge = false,
  value,
  subtext,
  bar,
  barLegend,
  href,
  className,
}: MonthSummaryCardProps) {
  return (
    <MetricCard
      icon={icon}
      label={label}
      badge={badge}
      reserveBadge={reserveBadge}
      value={value}
      lines={<span className="line-clamp-2">{subtext}</span>}
      footer={
        <>
          {bar}
          <p className="text-caption text-fg-secondary">{barLegend}</p>
        </>
      }
      href={href}
      className={className}
    />
  );
}
