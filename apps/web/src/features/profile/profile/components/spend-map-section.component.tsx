import type { SpendHeatmap as SpendHeatmapDto } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';
import {
  Money,
  MonthPicker,
  Section,
  SegmentedControl,
  Skeleton,
  SpendHeatmap,
  SpendHeatmapLegend,
} from '@fincheck/ui';
import { AnimatePresence, motion } from 'motion/react';

import type { HeatmapSummary } from '#/features/profile/profile/types/heatmap-summary.type.ts';
import { AnimatedHeight } from '#/features/profile/profile/components/animated-height.component.tsx';
import { HeatmapStat } from '#/features/profile/profile/components/heatmap-stat.component.tsx';
import { SPEND_MAP_MODE_OPTIONS } from '#/features/profile/profile/constants/spend-map-mode-options.constant.ts';
import type { SpendMapPeriod } from '#/features/profile/profile/types/spend-map-period.type.ts';
import { describeSpendMapPeriod } from '#/features/profile/profile/utils/describe-spend-map-period.util.ts';
import { formatPeakDay } from '#/features/profile/profile/utils/format-peak-day.util.ts';
import { resolveSpendMapView } from '#/features/profile/profile/utils/resolve-spend-map-view.util.ts';
import { SectionError } from '#/shared/components/states/section-error.component.tsx';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

type SpendMapSectionProps = {
  state: 'loading' | 'error' | 'ready';
  period: SpendMapPeriod;
  /** The current month or year: the next arrow stops. */
  isCurrent: boolean;
  /** The map of the period before is still on screen while the next one loads. */
  isRefreshing: boolean;
  data?: SpendHeatmapDto.Dto;
  summary?: HeatmapSummary;
  /** Today (`YYYY-MM-DD`): the days after it are not squares to choose. */
  today: string;
  onModeChange: (mode: SpendMapPeriod['mode']) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
  onSelectDay: (date: string) => void;
};

const FADE = { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] } as const;

/** The size of the map while it loads, so the card does not jump when the data arrives. */
function SpendMapSkeleton({ mode }: { mode: SpendMapPeriod['mode'] }) {
  return (
    <div role="status" aria-label="Carregando o mapa de gastos" className="flex flex-col gap-s24">
      <Skeleton
        className={mode === 'month' ? 'h-64 max-w-xs rounded-input' : 'h-42 rounded-input lg:h-34'}
      />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 gap-s16 sm:grid-cols-3 lg:gap-s24">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex flex-col gap-s8">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "Mapa de gastos" (BR-PRF-003): the period (Mês | Ano, with the arrows), the map, the scale in
 * words and the figures in text (biggest day, average per day, days with nothing spent), so the map
 * never carries them alone. The space between the parts is the 24 of the scale. The body swaps with
 * a fade and the box follows the height of what it holds (the year is short, the month is tall).
 */
export function SpendMapSection({
  state,
  period,
  isCurrent,
  isRefreshing,
  data,
  summary,
  today,
  onModeChange,
  onPrevious,
  onNext,
  onRetry,
  onSelectDay,
}: SpendMapSectionProps) {
  const { monthLabel, yearLabel } = formatMonthParts(period.month);
  // The map on screen decides the view (it can still be the previous period while the next loads).
  const view = data ? resolveSpendMapView(data.fromOn, data.untilOn) : period.mode;
  const key = state === 'ready' && data ? `${data.fromOn}..${data.untilOn}` : state;

  return (
    <Section
      title="Mapa de gastos"
      action={
        <SegmentedControl
          label="Período do mapa"
          options={SPEND_MAP_MODE_OPTIONS}
          value={period.mode}
          onChange={(next) => onModeChange(next as SpendMapPeriod['mode'])}
        />
      }
    >
      <div className="flex flex-col gap-s24">
        <div>
          <MonthPicker
            monthLabel={monthLabel}
            yearLabel={yearLabel}
            unit={period.mode}
            isNextDisabled={isCurrent}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </div>
        <AnimatedHeight>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: isRefreshing ? 0.5 : 1 }}
              exit={{ opacity: 0 }}
              transition={FADE}
              aria-busy={isRefreshing || undefined}
              className="flex flex-col gap-s24"
            >
              {state === 'loading' ? <SpendMapSkeleton mode={period.mode} /> : null}
              {state === 'error' ? (
                <SectionError what="o mapa de gastos" onRetry={onRetry} />
              ) : null}
              {state === 'ready' && data && summary ? (
                <>
                  <SpendHeatmap
                    days={data.days}
                    view={view}
                    today={today}
                    label={describeSpendMapPeriod(view, data.fromOn.slice(0, 7))}
                    onSelectDay={onSelectDay}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-x-s16 gap-y-s8">
                    <p className="text-meta text-fg-secondary">
                      Toque num dia para ver as transações dele.
                    </p>
                    <SpendHeatmapLegend />
                  </div>
                  <dl className="grid grid-cols-1 gap-s16 sm:grid-cols-3 lg:gap-s24">
                    <HeatmapStat
                      label="Maior dia"
                      value={
                        summary.peak ? (
                          <Money cents={summary.peak.totalCents} sign="none" tone="expense" />
                        ) : (
                          <span>Nenhum gasto</span>
                        )
                      }
                      hint={summary.peak ? formatPeakDay(summary.peak.date) : undefined}
                    />
                    <HeatmapStat
                      label="Média por dia"
                      value={<Money cents={summary.averageCents} sign="none" tone="expense" />}
                      hint={countWord(summary.dayCount, 'dia', 'dias')}
                    />
                    <HeatmapStat
                      label="Dias sem gasto"
                      value={<span className="tabular-nums">{summary.daysWithoutSpending}</span>}
                      hint={`${summary.spendingDays} com gasto`}
                    />
                  </dl>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </AnimatedHeight>
      </div>
    </Section>
  );
}
