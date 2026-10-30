import { type ReactNode, useRef } from 'react';
import { Button } from 'react-aria-components';

import { dayLongLabel } from '#/components/day-strip/day-date.util.ts';
import { DayStrip } from '#/components/day-strip/day-strip.component.tsx';
import type { DayStripDay, DayStripVariant } from '#/components/day-strip/day-strip.type.ts';
import { DayStripLegend } from '#/components/day-strip/day-strip-legend.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { Section } from '#/components/sections/section.component.tsx';

type DayStripSectionProps<TItem> = {
  /** "Até o fim do mês" or "Outubro, dia a dia". */
  title: string;
  variant: DayStripVariant;
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

const ARROW =
  'group relative hidden size-ctl-sm cursor-pointer place-items-center rounded-capsule text-fg-secondary outline-none transition-[background-color,color] duration-(--duration-fast) after:absolute after:-inset-1.5 after:content-[""] data-[hovered]:bg-brand-weak data-[hovered]:text-brand data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand lg:grid lg:size-8';

function scrollByPage(list: HTMLElement | null, direction: -1 | 1) {
  if (!list) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  list.scrollBy({
    left: direction * list.clientWidth * 0.8,
    behavior: reduced ? 'auto' : 'smooth',
  });
}

/**
 * The two forms of the strip with their section: "Até o fim do mês" (10 days, projected
 * balance, header link) and "Outubro, dia a dia" (the month, markers, legend and arrows), plus
 * the detail of the chosen day (components.md 4). The rows of the detail are a slot.
 */
export function DayStripSection<TItem>({
  title,
  variant,
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

  const header =
    variant === 'occurrences' ? (
      <>
        <Button
          aria-label="Dias anteriores"
          onPress={() => scrollByPage(listRef.current, -1)}
          className={ARROW}
        >
          <Icon name="chevron-left" size="md" />
        </Button>
        <Button
          aria-label="Próximos dias"
          onPress={() => scrollByPage(listRef.current, 1)}
          className={ARROW}
        >
          <Icon name="chevron-right" size="md" />
        </Button>
      </>
    ) : (
      action
    );

  return (
    <Section title={title} action={header} className={className}>
      {variant === 'occurrences' ? <DayStripLegend /> : null}
      <DayStrip
        scrollerRef={listRef}
        days={days}
        today={today}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        variant={variant}
        label={title}
      />
      {renderDay && selectedDay ? (
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
