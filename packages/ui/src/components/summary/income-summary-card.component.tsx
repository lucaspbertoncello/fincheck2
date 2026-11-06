import { Chip } from '#/components/chips/chip.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { MonthSummaryCard } from '#/components/summary/month-summary-card.component.tsx';
import { SummaryBar } from '#/components/summary/summary-bar.component.tsx';
import type { SummaryBarSegment } from '#/components/summary/summary-bar-segment.type.ts';

type IncomeSummaryCardProps = {
  receivedCents: number;
  expectedCents: number;
  /** Received over expected, in whole percent. */
  percent: number;
  /** Ready bar stretches. */
  barSegments: SummaryBarSegment[];
  /** What is still to come, in words ("Maxxy ainda vem"). */
  pendingNote?: string;
  label?: string;
  /** Makes the card a link (see `MonthSummaryCard`). */
  href?: string;
};

/** "Receitas" card (components.md 3.2): received over expected, with the percent as the badge. */
export function IncomeSummaryCard({
  receivedCents,
  expectedCents,
  percent,
  barSegments,
  pendingNote,
  label = 'Receitas',
  href,
}: IncomeSummaryCardProps) {
  return (
    <MonthSummaryCard
      href={href}
      icon="trend"
      label={label}
      badge={
        <Chip tone="ok" className="font-emphasis tabular-nums">
          <span className="sr-only">Recebido </span>
          {percent}%
        </Chip>
      }
      value={<Money cents={receivedCents} sign="none" />}
      subtext={
        <>
          de <Money cents={expectedCents} sign="none" weight="plain" />
          {pendingNote ? `; ${pendingNote}` : null}
        </>
      }
      bar={<SummaryBar segments={barSegments} label={`Recebido: ${percent}% do esperado`} />}
      barLegend="Recebido do esperado"
    />
  );
}
