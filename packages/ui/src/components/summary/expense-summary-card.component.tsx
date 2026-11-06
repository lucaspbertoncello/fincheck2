import { VariationBadge } from '#/components/chips/variation-badge.component.tsx';
import { capitalize } from '#/components/summary/capitalize.util.ts';
import { Money } from '#/components/money/money.component.tsx';
import { MonthSummaryCard } from '#/components/summary/month-summary-card.component.tsx';
import { SignedMoney } from '#/components/summary/signed-money.component.tsx';
import { SummaryBar } from '#/components/summary/summary-bar.component.tsx';
import type { SummaryBarSegment } from '#/components/summary/summary-bar-segment.type.ts';

type ExpenseSummaryCardProps = {
  spentCents: number;
  /** Spent in the previous month up to the same day. */
  previousSamePointCents: number;
  /** Ready bar stretches: the previous month, what is spent of it and what went past it. */
  barSegments: SummaryBarSegment[];
  /** Variation against the previous month at the same point, in percent; null when there is none. */
  variationPercent: number | null;
  /** Name of the previous month, lower case ("setembro"). */
  previousMonthLabel: string;
  label?: string;
  /** Makes the card a link (see `MonthSummaryCard`). */
  href?: string;
};

/**
 * "Despesas" card (components.md 3.2): spent so far against the same point of the previous month.
 * The badge is the shared `VariationBadge`, so it stays gray under 10% (ui adjustment 4).
 */
export function ExpenseSummaryCard({
  spentCents,
  previousSamePointCents,
  barSegments,
  variationPercent,
  previousMonthLabel,
  label = 'Despesas',
  href,
}: ExpenseSummaryCardProps) {
  const deltaCents = spentCents - previousSamePointCents;

  return (
    <MonthSummaryCard
      href={href}
      icon="receipt"
      label={label}
      badge={variationPercent === null ? null : <VariationBadge percent={variationPercent} />}
      value={<Money cents={spentCents} sign="none" />}
      subtext={
        deltaCents === 0 ? (
          `igual a ${previousMonthLabel}`
        ) : (
          <>
            <SignedMoney cents={deltaCents} /> que {previousMonthLabel}
          </>
        )
      }
      bar={
        <SummaryBar
          segments={barSegments}
          label={`Gasto do mês contra ${previousMonthLabel} inteiro`}
        />
      }
      barLegend={`${capitalize(previousMonthLabel)} e o que passou dele`}
    />
  );
}
