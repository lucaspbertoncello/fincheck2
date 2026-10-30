import type { SpendHeatmap as SpendHeatmapDto } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';
import { Money, Section, SpendHeatmap, SpendHeatmapLegend } from '@fincheck/ui';

import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { HeatmapStat } from '#/features/settings/settings/profile/components/heatmap-stat.component.tsx';
import { formatPeakDay } from '#/features/settings/settings/profile/utils/format-peak-day.util.ts';
import type { HeatmapSummary } from '#/features/settings/settings/profile/utils/summarize-heatmap.util.ts';

type SpendMapSectionProps = {
  state: 'loading' | 'error' | 'ready';
  data?: SpendHeatmapDto.Dto;
  summary?: HeatmapSummary;
  onRetry: () => void;
  onSelectDay: (date: string) => void;
};

/**
 * "Gasto dos últimos 12 meses" (BR-PRF-003): the map, the scale in words and the figures in text
 * (biggest day, average per day, days with nothing spent), so the map never carries them alone.
 */
export function SpendMapSection({
  state,
  data,
  summary,
  onRetry,
  onSelectDay,
}: SpendMapSectionProps) {
  return (
    <Section title="Gasto dos últimos 12 meses" variant="glass">
      {state === 'loading' ? <SectionSkeleton label="Carregando o mapa de gastos" /> : null}
      {state === 'error' ? (
        <SectionError message="Não deu para carregar o mapa de gastos." onRetry={onRetry} />
      ) : null}
      {state === 'ready' && data && summary ? (
        <>
          <dl className="grid grid-cols-1 gap-s16 sm:grid-cols-3 lg:gap-s24">
            <HeatmapStat
              label="Maior dia"
              value={
                summary.peak ? (
                  <Money cents={summary.peak.totalCents} sign="none" />
                ) : (
                  <span>Nenhum gasto</span>
                )
              }
              hint={summary.peak ? formatPeakDay(summary.peak.date) : undefined}
            />
            <HeatmapStat
              label="Média por dia"
              value={<Money cents={summary.averageCents} sign="none" />}
              hint={`${data.days.length} dias`}
            />
            <HeatmapStat
              label="Dias sem gasto"
              value={<span className="tabular-nums">{summary.daysWithoutSpending}</span>}
              hint={`${summary.spendingDays} com gasto`}
            />
          </dl>
          <SpendHeatmap
            days={data.days}
            label="Gasto por dia nos últimos 12 meses"
            onSelectDay={onSelectDay}
          />
          <div className="flex flex-wrap items-center justify-between gap-x-s16 gap-y-s8">
            <p className="text-meta text-fg-secondary">
              Toque num dia para ver as transações dele.
            </p>
            <SpendHeatmapLegend />
          </div>
        </>
      ) : null}
    </Section>
  );
}
