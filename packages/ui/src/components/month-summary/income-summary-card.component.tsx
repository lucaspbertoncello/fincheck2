import { Chip } from '#/components/chips/chip.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { incomeBar } from '#/components/month-summary/income-bar.util.ts';
import { MonthSummaryCard } from '#/components/month-summary/month-summary-card.component.tsx';
import { SummaryBar } from '#/components/month-summary/summary-bar.component.tsx';

type IncomeSummaryCardProps = {
  receivedCents: number;
  expectedCents: number;
  /** What is still to come, in words ("Maxxy ainda vem"). */
  pendingNote?: string;
  label?: string;
};

/** "Receitas" card (components.md 3.2): received over expected, with the percent as the badge. */
export function IncomeSummaryCard({
  receivedCents,
  expectedCents,
  pendingNote,
  label = 'Receitas',
}: IncomeSummaryCardProps) {
  const percent = expectedCents > 0 ? Math.round((receivedCents / expectedCents) * 100) : 0;

  return (
    <MonthSummaryCard
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
      bar={
        <SummaryBar
          segments={incomeBar(receivedCents, expectedCents)}
          label={`Recebido: ${percent}% do esperado`}
        />
      }
      barLegend="Recebido do esperado"
    />
  );
}
