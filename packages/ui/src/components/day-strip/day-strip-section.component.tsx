import { MotionConfig } from 'motion/react';
import { type ReactNode, useRef, useState } from 'react';

import { ArrowButton } from '#/components/buttons/arrow-button.component.tsx';
import { dayLongLabel } from '#/components/day-strip/day-long-label.util.ts';
import { DaySlider } from '#/components/day-strip/day-slider.component.tsx';
import { DayStrip } from '#/components/day-strip/day-strip.component.tsx';
import type {
  DayStripDay,
  DayStripMode,
  DayStripVariant,
} from '#/components/day-strip/day-strip.type.ts';
import { DayStripLegend } from '#/components/day-strip/day-strip-legend.component.tsx';
import { groupDaysByWeek } from '#/components/day-strip/group-days-by-week.util.ts';
import { WeekCards } from '#/components/day-strip/week-cards.component.tsx';
import { SegmentedControl } from '#/components/forms/segmented-control.component.tsx';
import { Section } from '#/components/sections/section.component.tsx';

type DayStripSectionProps<TItem> = {
  /** "Até o fim do mês" or "Outubro, dia a dia". */
  title: string;
  variant: DayStripVariant;
  /** Projection only: the chosen view, "day" (slider) or "week" (cards). Without it the section keeps its own. */
  mode?: DayStripMode;
  onModeChange?: (mode: DayStripMode) => void;
  days: readonly DayStripDay<TItem>[];
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Header link of the "projection" form ("A pagar e receber"). */
  action?: ReactNode;
  /** The list of the chosen day under the strip; the rows come from the caller (slot). */
  renderDay?: (day: DayStripDay<TItem>) => ReactNode;
  /** Shown when the chosen day has no items. */
  emptyDayLabel?: string;
  /** Under the detail: the "atrasados" and "sem data" chips. */
  footer?: ReactNode;
  className?: string;
};

const MODE_OPTIONS = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
];

function scrollByPage(list: HTMLElement | null, direction: -1 | 1) {
  if (!list) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  list.scrollBy({
    left: direction * list.clientWidth * 0.8,
    behavior: reduced ? 'auto' : 'smooth',
  });
}

/**
 * The two forms of the strip with their section. "Até o fim do mês" (projection) has a Dia | Semana
 * selector (BR-DSH-014): "Dia" is a slider of days with the figures of the chosen one, "Semana" is
 * the weeks that are left; it never shows all the days at once. "Outubro, dia a dia" (occurrences)
 * is the month with markers, legend and arrows. Both end with the detail of the chosen day
 * (components.md 4), whose rows are a slot.
 */
export function DayStripSection<TItem>({
  title,
  variant,
  mode,
  onModeChange,
  days,
  today,
  selectedDate,
  onSelectDate,
  action,
  renderDay,
  emptyDayLabel = 'Nada neste dia',
  footer,
  className,
}: DayStripSectionProps<TItem>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const selectedDay = days.find((day) => day.date === selectedDate);
  const [ownMode, setOwnMode] = useState<DayStripMode>('day');
  const activeMode = mode ?? ownMode;
  const showsWeeks = variant === 'projection' && activeMode === 'week';

  function changeMode(next: DayStripMode) {
    setOwnMode(next);
    onModeChange?.(next);
  }

  const header =
    variant === 'occurrences' ? (
      <>
        <ArrowButton
          direction="previous"
          label="Dias anteriores"
          desktopOnly
          onPress={() => scrollByPage(listRef.current, -1)}
        />
        <ArrowButton
          direction="next"
          label="Próximos dias"
          desktopOnly
          onPress={() => scrollByPage(listRef.current, 1)}
        />
      </>
    ) : (
      action
    );

  return (
    <Section title={title} action={header} className={className}>
      {variant === 'projection' ? (
        <SegmentedControl
          label="Ver por"
          options={MODE_OPTIONS}
          value={activeMode}
          onChange={(key) => changeMode(key === 'week' ? 'week' : 'day')}
        />
      ) : null}
      {variant === 'occurrences' ? <DayStripLegend /> : null}
      {variant === 'occurrences' ? (
        <DayStrip
          scrollerRef={listRef}
          days={days}
          today={today}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          variant={variant}
          label={title}
        />
      ) : showsWeeks ? (
        <MotionConfig reducedMotion="user">
          <WeekCards
            label={`Semanas: ${title}`}
            weeks={groupDaysByWeek(days, today)}
            onSelectWeek={(week) => {
              onSelectDate(week.startDate);
              changeMode('day');
            }}
          />
        </MotionConfig>
      ) : (
        <MotionConfig reducedMotion="user">
          <DaySlider
            days={days}
            today={today}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            label={title}
          />
        </MotionConfig>
      )}
      {renderDay && selectedDay && !showsWeeks ? (
        <div aria-live="polite" className="flex flex-col gap-s8 border-t border-line pt-s12">
          <p className="text-meta text-fg-secondary">{dayLongLabel(selectedDay.date)}</p>
          {selectedDay.items.length > 0 ? (
            renderDay(selectedDay)
          ) : (
            <p className="text-body text-fg-secondary">{emptyDayLabel}</p>
          )}
        </div>
      ) : null}
      {footer}
    </Section>
  );
}
