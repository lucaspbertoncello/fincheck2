import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { buildHeatmapGrid } from '#/components/heatmap/build-heatmap-grid.util.ts';
import { clampHeatmapLevel } from '#/components/heatmap/clamp-heatmap-level.util.ts';
import { describeHeatmapDay } from '#/components/heatmap/describe-heatmap-day.util.ts';
import { maskFutureHeatmapDays } from '#/components/heatmap/mask-future-heatmap-days.util.ts';
import { SpendHeatmapMonth } from '#/components/heatmap/spend-heatmap-month.component.tsx';
import { formatHeatmapDayWithYear } from '#/components/heatmap/format-heatmap-day-with-year.util.ts';
import {
  HEATMAP_LEVEL_CLASS,
  HEATMAP_WEEKDAY_LABELS,
} from '#/components/heatmap/heatmap-level.constant.ts';
import { moveHeatmapFocus } from '#/components/heatmap/move-heatmap-focus.util.ts';
import { isHeatmapKey } from '#/components/heatmap/is-heatmap-key.util.ts';
import { type HeatmapPosition } from '#/components/heatmap/heatmap-position.type.ts';
import type {
  SpendHeatmapDay,
  SpendHeatmapGrid,
  SpendHeatmapView,
} from '#/components/heatmap/spend-heatmap.type.ts';
import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { cx } from '#/utils/class-names.util.ts';

type SpendHeatmapProps = {
  /** One item per day, in order, no gaps. The API already sets each `level`. */
  days: SpendHeatmapDay[];
  /** Accessible name of the grid ("Gasto por dia em 2026"). */
  label: string;
  /**
   * "year" (the default): a column per week, Sunday on top, the months over it. "month": a
   * calendar with a row per week and the day number in each square, for a map of one month.
   */
  view?: SpendHeatmapView;
  /**
   * Today (`YYYY-MM-DD`). A map that runs past it (a year up to 31 December) shows the days after
   * it as faint outlines that cannot be chosen, and opens on the week of today.
   */
  today?: string;
  /** Enter or a tap on a day (the screen opens that day's transactions). */
  onSelectDay: (date: string) => void;
  className?: string;
};

type Tip = { date: string; totalCents: number; column: number; row: number };

function tipText(totalCents: number, hidden: boolean): string {
  if (totalCents <= 0) return 'Sem gastos';
  const value = `R$ ${formatMoneyParts(totalCents)}`;
  return hidden ? maskMoneyText(value) : value;
}

/** Vertical place of the tip: under the square for the top rows, over it for the rest. */
function tipPosition(row: number): { top?: string; bottom?: string } {
  const cell = 'var(--heatmap-cell)';
  const gap = 'var(--spacing-s4)';
  const rowGap = 'var(--spacing-s8)';
  if (row < 3) {
    return { top: `calc(${cell} * ${row + 2} + ${gap} * ${row + 1} + ${rowGap})` };
  }
  return { bottom: `calc(100% - ${cell} * ${row + 1} - ${gap} * ${row - 1} - ${rowGap})` };
}

/**
 * The spend map (BR-PRF-003). The year view (the default, also fit for 12 months): a square per
 * day, a column per week, Sunday on top, the month over the week that holds its 1st, Seg, Qua and
 * Sex at the left. The month view is a calendar (see `SpendHeatmapMonth`). Fluid on the desktop; on the
 * phone the squares keep a touchable size and the map scrolls sideways, opening on the current week.
 * The grid is a real `grid`: one tab stop, arrows move a day, Home and End go along the row, Page Up
 * and Down along the column. The tip (date and value) shows on hover and on focus, Esc hides it.
 * Every day has a name for screen readers (value first, then the date).
 */
export function SpendHeatmap({
  days,
  label,
  view = 'year',
  today,
  onSelectDay,
  className,
}: SpendHeatmapProps) {
  const grid = useMemo(() => buildHeatmapGrid(days), [days]);

  if (view === 'month') {
    return (
      <SpendHeatmapMonth
        grid={grid}
        label={label}
        today={today}
        onSelectDay={onSelectDay}
        className={className}
      />
    );
  }

  return (
    <SpendHeatmapYear
      grid={grid}
      label={label}
      today={today}
      onSelectDay={onSelectDay}
      className={className}
    />
  );
}

type SpendHeatmapYearProps = Pick<
  SpendHeatmapProps,
  'label' | 'today' | 'onSelectDay' | 'className'
> & {
  grid: SpendHeatmapGrid;
};

function SpendHeatmapYear({ grid, label, today, onSelectDay, className }: SpendHeatmapYearProps) {
  const hidden = useMoneyHidden();
  const { weeks, monthLabels } = grid;
  const navigable = useMemo(() => maskFutureHeatmapDays(weeks, today), [weeks, today]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<HeatmapPosition | null>(null);

  // The last day that can be chosen (the last of the map, or today when the map runs past it).
  const lastColumn = navigable.reduce(
    (last, week, index) => (week.some(Boolean) ? index : last),
    0,
  );
  const lastRow = (navigable[lastColumn] ?? []).reduce((row, day, index) => (day ? index : row), 0);
  const tabStop = active ?? { column: lastColumn, row: lastRow };

  // Opens on the current week (the right edge of the map; with a few weeks ahead when the map runs
  // to 31 December) and stays there until the person moves the map. One write at mount is not
  // enough: the scroller may not have its final width yet (fonts, a hidden parent that is
  // revealed, the sheet of the phone settling), so the position is applied again whenever the
  // scroller or its content changes size.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let moved = false;
    const toEnd = () => {
      if (moved) return;
      const ahead = Math.min(lastColumn + 3, weeks.length - 1);
      scroller.scrollLeft =
        ahead === weeks.length - 1
          ? scroller.scrollWidth
          : ((ahead + 1) / weeks.length) * scroller.scrollWidth - scroller.clientWidth;
    };
    const stop = () => {
      moved = true;
    };
    toEnd();
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
    for (const name of events) scroller.addEventListener(name, stop, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(toEnd);
    observer?.observe(scroller);
    if (scroller.firstElementChild) observer?.observe(scroller.firstElementChild);
    return () => {
      for (const name of events) scroller.removeEventListener(name, stop);
      observer?.disconnect();
    };
  }, [weeks.length, lastColumn]);

  const columns = `repeat(${weeks.length}, minmax(var(--heatmap-cell-min), 1fr))`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setTip(null);
      return;
    }
    if (!isHeatmapKey(event.key)) return;
    event.preventDefault();
    const next = moveHeatmapFocus(navigable, tabStop, event.key);
    const day = navigable[next.column]?.[next.row];
    if (!day) return;
    setActive(next);
    cellRefs.current.get(day.date)?.focus();
  }

  const tipAlign =
    tip === null
      ? ''
      : tip.column < 4
        ? 'translate-x-0'
        : tip.column > weeks.length - 5
          ? '-translate-x-full'
          : '-translate-x-1/2';

  return (
    <div className={cx('flex items-start gap-s8', className)}>
      <div
        aria-hidden="true"
        className="flex shrink-0 flex-col gap-s4 pt-[calc(var(--heatmap-cell)+var(--spacing-s8))] text-meta leading-none text-fg-secondary [--heatmap-cell:var(--spacing-s16)] lg:[--heatmap-cell:var(--spacing-s12)]"
      >
        {Array.from({ length: 7 }, (_, row) => (
          <span key={row} className="flex h-(--heatmap-cell) items-center">
            {HEATMAP_WEEKDAY_LABELS[row] ?? ''}
          </span>
        ))}
      </div>
      <div
        ref={scrollerRef}
        className="min-w-0 flex-1 overflow-x-auto pb-s8 [--heatmap-cell-min:var(--spacing-s16)] [--heatmap-cell:var(--spacing-s16)] lg:[--heatmap-cell-min:0px] lg:[--heatmap-cell:var(--spacing-s12)]"
      >
        <div className="relative flex flex-col gap-s8">
          <div
            aria-hidden="true"
            className="grid h-(--heatmap-cell) gap-x-s4 text-meta leading-none text-fg-secondary"
            style={{ gridTemplateColumns: columns }}
          >
            {monthLabels.map((month) => (
              <span
                key={month.column}
                className="flex items-center whitespace-nowrap"
                style={{ gridColumnStart: month.column + 1 }}
              >
                {month.label}
              </span>
            ))}
          </div>
          <div
            role="grid"
            aria-label={label}
            aria-colcount={weeks.length}
            aria-rowcount={7}
            onKeyDown={onKeyDown}
            onMouseLeave={() => setTip(null)}
            className="flex flex-col gap-s4"
          >
            {Array.from({ length: 7 }, (_, row) => (
              <div
                key={row}
                role="row"
                className="grid gap-x-s4"
                style={{ gridTemplateColumns: columns }}
              >
                {weeks.map((week, column) => {
                  const day = week[row];
                  if (!day) return <span key={column} role="presentation" aria-hidden="true" />;
                  if (today && day.date > today) {
                    return (
                      <span
                        key={day.date}
                        role="presentation"
                        aria-hidden="true"
                        className="h-(--heatmap-cell) w-full rounded-mini border border-dashed border-line opacity-60"
                      />
                    );
                  }
                  const isTabStop = tabStop.column === column && tabStop.row === row;
                  const showTip = () =>
                    setTip({ date: day.date, totalCents: day.totalCents, column, row });
                  return (
                    <span key={day.date} role="gridcell" className="relative flex">
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) cellRefs.current.set(day.date, node);
                          else cellRefs.current.delete(day.date);
                        }}
                        tabIndex={isTabStop ? 0 : -1}
                        aria-label={describeHeatmapDay(day.date, day.totalCents, hidden)}
                        onClick={() => onSelectDay(day.date)}
                        onFocus={() => {
                          setActive({ column, row });
                          showTip();
                        }}
                        onBlur={() => setTip(null)}
                        onMouseEnter={showTip}
                        className={cx(
                          'focus-ring h-(--heatmap-cell) w-full cursor-pointer rounded-mini',
                          'transition-transform duration-(--duration-fast) ease-(--ease-standard) hover:scale-125 motion-reduce:transition-none motion-reduce:hover:scale-100',
                          // A touch target of 24 px around the 16 px square, without growing the map.
                          'before:absolute before:-inset-s4 before:content-[""] lg:before:hidden',
                          HEATMAP_LEVEL_CLASS[clampHeatmapLevel(day.level)],
                        )}
                      />
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {tip ? (
            <div
              aria-hidden="true"
              className={cx(
                'pointer-events-none absolute z-(--z-tooltip) flex w-max max-w-56 flex-col gap-s4 rounded-input bg-fg-primary px-s12 py-s8 text-meta text-page',
                tipAlign,
              )}
              style={{
                left: `${((tip.column + 0.5) / weeks.length) * 100}%`,
                ...tipPosition(tip.row),
              }}
            >
              <span className="font-emphasis tabular-nums">{tipText(tip.totalCents, hidden)}</span>
              <span>{formatHeatmapDayWithYear(tip.date)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
