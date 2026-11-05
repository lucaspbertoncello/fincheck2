import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { clampHeatmapLevel } from '#/components/heatmap/clamp-heatmap-level.util.ts';
import { describeHeatmapDay } from '#/components/heatmap/describe-heatmap-day.util.ts';
import { formatHeatmapDayWithYear } from '#/components/heatmap/format-heatmap-day-with-year.util.ts';
import {
  HEATMAP_DAY_NUMBER_CLASS,
  HEATMAP_LEVEL_CLASS,
  HEATMAP_WEEKDAYS_SHORT,
} from '#/components/heatmap/heatmap-level.constant.ts';
import { maskFutureHeatmapDays } from '#/components/heatmap/mask-future-heatmap-days.util.ts';
import {
  isHeatmapKey,
  moveHeatmapFocus,
  type HeatmapPosition,
} from '#/components/heatmap/move-heatmap-focus.util.ts';
import type { SpendHeatmapGrid } from '#/components/heatmap/spend-heatmap.type.ts';
import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { cx } from '#/utils/class-names.util.ts';

type SpendHeatmapMonthProps = {
  /** The weeks of the month (`weeks[row][weekday]`, Sunday first): a row per week. */
  grid: SpendHeatmapGrid;
  label: string;
  /** Today (`YYYY-MM-DD`): the days after it are not squares to choose, and today is underlined. */
  today?: string;
  onSelectDay: (date: string) => void;
  className?: string;
};

/**
 * In the calendar the arrows follow the screen, not the columns of the year map: left and right go
 * along the week (a weekday), up and down go between the weeks; Home and End are the first and last
 * day of the week, Page Up and Down the same weekday in the first and last week.
 */
const MONTH_KEY: Record<string, string> = {
  ArrowLeft: 'ArrowUp',
  ArrowRight: 'ArrowDown',
  ArrowUp: 'ArrowLeft',
  ArrowDown: 'ArrowRight',
  Home: 'PageUp',
  End: 'PageDown',
  PageUp: 'Home',
  PageDown: 'End',
};

function tipText(totalCents: number, hidden: boolean): string {
  if (totalCents <= 0) return 'Sem gastos';
  const value = `R$ ${formatMoneyParts(totalCents)}`;
  return hidden ? maskMoneyText(value) : value;
}

/** Where the tip sits horizontally: against the edge for the first and last weekdays, else centered. */
function tipSide(weekday: number): string {
  if (weekday < 2) return 'left-0';
  if (weekday > 4) return 'right-0';
  return 'left-1/2 -translate-x-1/2';
}

/**
 * The month as a calendar (BR-PRF-003, "Mês"): the weekdays on top, a row per week, the day number
 * inside each square and the fill by spend. Same behaviors as the year map: one tab stop, the arrows
 * move a day, the tip (value and date) shows on hover and focus, every day has a name for screen
 * readers. The squares are fluid up to the width of the calendar.
 */
export function SpendHeatmapMonth({
  grid,
  label,
  today,
  onSelectDay,
  className,
}: SpendHeatmapMonthProps) {
  const hidden = useMoneyHidden();
  const rows = grid.weeks;
  const navigable = useMemo(() => maskFutureHeatmapDays(rows, today), [rows, today]);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const [tipDate, setTipDate] = useState<string | null>(null);
  const [active, setActive] = useState<HeatmapPosition | null>(null);

  // `column` is the week (the row of the calendar) and `row` the weekday, as in the year map.
  const lastWeek = navigable.reduce((last, week, index) => (week.some(Boolean) ? index : last), 0);
  const lastWeekday = (navigable[lastWeek] ?? []).reduce(
    (last, day, index) => (day ? index : last),
    0,
  );
  const tabStop = active ?? { column: lastWeek, row: lastWeekday };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setTipDate(null);
      return;
    }
    const mapped = MONTH_KEY[event.key];
    if (!mapped || !isHeatmapKey(event.key)) return;
    event.preventDefault();
    const next = moveHeatmapFocus(navigable, tabStop, mapped);
    const day = navigable[next.column]?.[next.row];
    if (!day) return;
    setActive(next);
    cellRefs.current.get(day.date)?.focus();
  }

  return (
    <div className={cx('flex w-full max-w-xs flex-col gap-s8', className)}>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-x-s4 text-center text-meta leading-none text-fg-secondary"
      >
        {HEATMAP_WEEKDAYS_SHORT.map((name) => (
          <span key={name} className="whitespace-nowrap">
            {name}
          </span>
        ))}
      </div>
      <div
        role="grid"
        aria-label={label}
        aria-colcount={7}
        aria-rowcount={rows.length}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setTipDate(null)}
        className="flex flex-col gap-s4"
      >
        {rows.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-x-s4">
            {week.map((day, weekday) => {
              if (!day) return <span key={weekday} role="presentation" aria-hidden="true" />;
              const number = Number(day.date.slice(8, 10));
              if (today && day.date > today) {
                return (
                  <span
                    key={day.date}
                    role="presentation"
                    aria-hidden="true"
                    className="flex aspect-square items-center justify-center rounded-mini border border-dashed border-line text-meta text-fg-tertiary tabular-nums opacity-60"
                  >
                    {number}
                  </span>
                );
              }
              const level = clampHeatmapLevel(day.level);
              const isTabStop = tabStop.column === weekIndex && tabStop.row === weekday;

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
                      setActive({ column: weekIndex, row: weekday });
                      setTipDate(day.date);
                    }}
                    onBlur={() => setTipDate(null)}
                    onMouseEnter={() => setTipDate(day.date)}
                    className={cx(
                      'focus-ring flex aspect-square w-full cursor-pointer items-center justify-center rounded-mini text-meta tabular-nums',
                      'transition-transform duration-(--duration-fast) ease-(--ease-standard) hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100',
                      HEATMAP_LEVEL_CLASS[level],
                      HEATMAP_DAY_NUMBER_CLASS[level],
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        day.date === today && 'font-emphasis underline underline-offset-2',
                      )}
                    >
                      {number}
                    </span>
                  </button>
                  {tipDate === day.date ? (
                    <div
                      aria-hidden="true"
                      className={cx(
                        'pointer-events-none absolute z-(--z-tooltip) flex w-max max-w-56 flex-col gap-s4 rounded-input bg-fg-primary px-s12 py-s8 text-meta text-page',
                        weekIndex === 0 ? 'top-full mt-s4' : 'bottom-full mb-s4',
                        tipSide(weekday),
                      )}
                    >
                      <span className="font-emphasis tabular-nums">
                        {tipText(day.totalCents, hidden)}
                      </span>
                      <span>{formatHeatmapDayWithYear(day.date)}</span>
                    </div>
                  ) : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
