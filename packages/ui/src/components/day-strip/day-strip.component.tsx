import { type RefObject, useEffect, useRef } from 'react';
import { ListBox, ListBoxItem, type Selection } from 'react-aria-components';

import {
  dayLongLabel,
  parseBusinessDate,
  weekdayShort,
} from '#/components/day-strip/day-date.util.ts';
import { DayMarkerDot, describeMarker } from '#/components/day-strip/day-marker.component.tsx';
import type { DayStripDay, DayStripVariant } from '#/components/day-strip/day-strip.type.ts';
import { formatDayTotal } from '#/components/day-strip/format-day-total.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { cx } from '#/utils/class-names.util.ts';

type DayStripProps<TItem> = {
  days: readonly DayStripDay<TItem>[];
  /** Today's business date (`YYYY-MM-DD`). */
  today: string;
  /** The chosen day. */
  selectedDate: string;
  onSelectDate: (date: string) => void;
  variant: DayStripVariant;
  /** Accessible name of the list ("Até o fim do mês"). */
  label: string;
  /** The scrolling element, so the section can wire its arrows. */
  scrollerRef?: RefObject<HTMLDivElement | null>;
};

const LIST_CLASS = {
  // 10 columns side by side on the desktop, a sideways scroll with snap on the phone.
  projection:
    'flex gap-s8 snap-x overflow-x-auto overscroll-x-contain scroll-px-s4 scrollbar-none -m-s4 p-s4 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:overflow-visible',
  // The whole month, always scrolling, with snap.
  occurrences:
    'flex gap-s8 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-s4 scrollbar-none -m-s4 p-s4',
} as const;

const ITEM_CLASS = {
  projection: 'w-14 lg:w-auto',
  occurrences: 'w-14 lg:w-18',
} as const;

const EMPTY_VALUE = 'h-s16 text-caption leading-4 text-fg-tertiary';

function itemLabel<TItem>(day: DayStripDay<TItem>, variant: DayStripVariant, hidden: boolean) {
  const parts = [dayLongLabel(day.date)];
  if (variant === 'projection') {
    if (day.totalCents !== undefined && day.items.length > 0) {
      parts.push(`saldo ${hidden ? 'valor oculto' : formatDayTotal(day.totalCents)}`);
    }
  } else if (day.markers?.length) {
    parts.push(day.markers.map(describeMarker).join(', '));
  }
  return parts.join(', ');
}

type DayValueProps<TItem> = {
  day: DayStripDay<TItem>;
  variant: DayStripVariant;
  hidden: boolean;
};

/** Lower part of a day: the projected balance, the markers or a dot when nothing happens. */
function DayValue<TItem>({ day, variant, hidden }: DayValueProps<TItem>) {
  if (variant === 'occurrences') {
    return day.markers?.length ? (
      <span className="flex h-s16 items-center justify-center gap-s4">
        {day.markers.map((marker, index) => (
          <DayMarkerDot key={index} flow={marker.flow} status={marker.status} />
        ))}
      </span>
    ) : (
      <span className={EMPTY_VALUE}>·</span>
    );
  }
  if (day.totalCents === undefined || day.items.length === 0) {
    return <span className={EMPTY_VALUE}>·</span>;
  }
  return (
    <span
      className={cx(
        'money-numeric h-s16 text-caption leading-4 font-emphasis',
        day.totalCents < 0 ? 'text-loss' : day.totalCents > 0 ? 'text-gain' : 'text-fg-secondary',
      )}
    >
      {hidden ? '••••' : formatDayTotal(day.totalCents)}
    </span>
  );
}

/**
 * The strip of days (components.md 4): one button per day, chosen with the arrow keys, the
 * mouse or touch. Presentation only: the screen sends the days ready and gets the choice back.
 */
export function DayStrip<TItem>({
  days,
  today,
  selectedDate,
  onSelectDate,
  variant,
  label,
  scrollerRef,
}: DayStripProps<TItem>) {
  const hidden = useMoneyHidden();
  const ownRef = useRef<HTMLDivElement>(null);
  const listRef = scrollerRef ?? ownRef;

  // "Opens on today": today lands as the third day, with the two before it as context.
  useEffect(() => {
    const list = listRef.current;
    const todayItem = list?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    if (variant !== 'occurrences' || !list || !todayItem) return;
    list.scrollLeft = todayItem.offsetLeft - list.offsetLeft - 2 * (todayItem.offsetWidth + 8);
  }, [variant, today]);

  const onSelectionChange = (keys: Selection) => {
    const [first] = keys === 'all' ? [] : keys;
    if (typeof first === 'string') onSelectDate(first);
  };

  return (
    <ListBox
      ref={listRef}
      aria-label={label}
      orientation="horizontal"
      layout="stack"
      selectionMode="single"
      selectionBehavior="replace"
      disallowEmptySelection
      selectedKeys={[selectedDate]}
      onSelectionChange={onSelectionChange}
      className={LIST_CLASS[variant]}
    >
      {days.map((day) => {
        const isToday = day.date === today;
        const isPast = day.date < today;
        const hasMovement = day.items.length > 0 || Boolean(day.markers?.length);

        return (
          <ListBoxItem
            key={day.date}
            id={day.date}
            data-date={day.date}
            textValue={dayLongLabel(day.date)}
            aria-label={itemLabel(day, variant, hidden)}
            className={cx(
              'flex min-h-21 shrink-0 cursor-pointer snap-start flex-col items-center justify-between rounded-panel border border-transparent px-s4 py-s8 text-center outline-none',
              'transition-[background-color,border-color,transform] duration-(--duration-fast) motion-reduce:transition-none',
              'data-[hovered]:bg-brand-weak data-[pressed]:scale-96 data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand',
              hasMovement && 'border-line bg-glass',
              'data-[selected]:border-brand data-[selected]:bg-brand-weak',
              variant === 'occurrences' && isPast && 'opacity-45',
              ITEM_CLASS[variant],
            )}
          >
            <span
              className={cx(
                'text-caption',
                isToday ? 'font-emphasis text-brand' : 'font-plain text-fg-secondary',
              )}
            >
              {isToday ? 'hoje' : weekdayShort(day.date)}
            </span>
            <span className="money-numeric text-money-sm leading-(--line-height-tight) font-numeric text-fg-primary">
              {parseBusinessDate(day.date).day}
            </span>
            <DayValue day={day} variant={variant} hidden={hidden} />
          </ListBoxItem>
        );
      })}
    </ListBox>
  );
}
