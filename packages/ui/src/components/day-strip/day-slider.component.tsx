import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type KeyboardEvent, useId, useState } from 'react';
import { Button } from 'react-aria-components';

import { dayLongLabel, shiftBusinessDate } from '#/components/day-strip/day-date.util.ts';
import type { DayStripDay } from '#/components/day-strip/day-strip.type.ts';
import { ProjectionFigures } from '#/components/day-strip/projection-figures.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { cx } from '#/utils/class-names.util.ts';

type Direction = 1 | -1;

type DaySliderProps<TItem> = {
  days: readonly DayStripDay<TItem>[];
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Accessible name of the slider ("Até o fim do mês"). */
  label: string;
};

const SLIDE_EASE = [0.2, 0, 0, 1] as const;
const SLIDE_SECONDS = 0.24;
const FADE_SECONDS = 0.12;
const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

/** The leaving day goes out one side, the next comes in from the other, 100% of the window. */
const SLIDE_VARIANTS = {
  enter: (direction: Direction) => ({ x: `${direction * 100}%`, opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (direction: Direction) => ({ x: `${direction * -100}%`, opacity: 0 }),
};

/** Reduced motion: no sliding, only a short cross fade. */
const FADE_VARIANTS = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

const ARROW =
  'group relative grid size-ctl-sm shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary outline-none transition-[background-color,color,transform] duration-(--duration-fast) after:absolute after:-inset-1.5 after:content-[""] data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[hovered]:bg-brand-weak data-[hovered]:text-brand data-[pressed]:scale-94 data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand lg:size-8';

function spokenMoney(cents: number, hidden: boolean): string {
  if (hidden) return 'valor oculto';
  return `${cents < 0 ? 'menos ' : ''}${formatMoneyParts(Math.abs(cents), true)} reais`;
}

/**
 * "Dia" view of "Até o fim do mês" (BR-DSH-014): one day at a time, big, with what comes in, what
 * goes out and the projected balance. The day slides in the direction of the move, clipped to
 * its window so it never passes over the arrows (the same slider as the month picker). Arrows,
 * Left/Right and Home/End move; the dots below jump to a day with the pointer. Screen readers
 * hear the day in a polite live region; the animated text is hidden from them.
 */
export function DaySlider<TItem>({
  days,
  today,
  selectedDate,
  onSelectDate,
  label,
}: DaySliderProps<TItem>) {
  const hidden = useMoneyHidden();
  const reduced = useReducedMotion();
  const pillId = useId();
  const found = days.findIndex((day) => day.date === selectedDate);
  const index = Math.max(found, 0);
  const day = days[index];

  // The direction comes from the move itself, so a choice made elsewhere (a week card) slides too.
  const [track, setTrack] = useState<{ index: number; direction: Direction }>({
    index,
    direction: 1,
  });
  if (track.index !== index) {
    setTrack({ index, direction: index > track.index ? 1 : -1 });
  }

  if (!day) return null;

  const variants = reduced ? FADE_VARIANTS : SLIDE_VARIANTS;
  const last = days.length - 1;
  const inCents = day.inCents ?? 0;
  const outCents = day.outCents ?? 0;
  const relative =
    day.date === today ? 'hoje' : day.date === shiftBusinessDate(today, 1) ? 'amanhã' : undefined;

  function goTo(target: number) {
    const next = days[Math.min(Math.max(target, 0), last)];
    if (next && next.date !== day?.date) onSelectDate(next.date);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target =
      event.key === 'ArrowLeft'
        ? index - 1
        : event.key === 'ArrowRight'
          ? index + 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    goTo(target);
  }

  const spoken = [
    dayLongLabel(day.date),
    relative,
    `entra ${spokenMoney(inCents, hidden)}`,
    `sai ${spokenMoney(outCents, hidden)}`,
    day.totalCents === undefined ? null : `saldo projetado ${spokenMoney(day.totalCents, hidden)}`,
    `dia ${index + 1} de ${days.length}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-s12">
      <div
        role="group"
        aria-roledescription="seletor de dias"
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="focus-ring grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s8 rounded-panel border border-line bg-glass p-s12 lg:p-s16"
      >
        <Button
          aria-label="Dia anterior"
          isDisabled={index === 0}
          excludeFromTabOrder
          onPress={() => goTo(index - 1)}
          className={ARROW}
        >
          <Icon name="chevron-left" size="md" />
        </Button>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {spoken}
        </span>
        <div aria-hidden="true" className="grid overflow-hidden">
          <AnimatePresence initial={false} custom={track.direction}>
            <motion.div
              key={day.date}
              custom={track.direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduced ? FADE_SECONDS : SLIDE_SECONDS, ease: SLIDE_EASE }}
              className="col-start-1 row-start-1 flex flex-col gap-s16 px-s4 py-s4"
            >
              <span className="flex flex-wrap items-baseline gap-x-s12 gap-y-s4">
                <span className="font-title text-subsection font-heading text-fg-primary">
                  {dayLongLabel(day.date)}
                </span>
                {relative ? (
                  <span className="rounded-capsule bg-brand-weak px-s8 py-s4 text-meta font-emphasis text-brand">
                    {relative}
                  </span>
                ) : null}
              </span>
              <ProjectionFigures
                inCents={inCents}
                outCents={outCents}
                balanceCents={day.totalCents}
                balanceLabel="Saldo projetado"
                layout="columns"
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <Button
          aria-label="Próximo dia"
          isDisabled={index === last}
          excludeFromTabOrder
          onPress={() => goTo(index + 1)}
          className={ARROW}
        >
          <Icon name="chevron-right" size="md" />
        </Button>
      </div>

      <div aria-hidden="true" className="flex items-center gap-s12 px-s4">
        <span className="shrink-0 text-caption text-fg-secondary tabular-nums">
          Dia {index + 1} de {days.length}
        </span>
        <div className="flex min-w-0 flex-1 items-center">
          {days.map((item, position) => (
            <Button
              key={item.date}
              excludeFromTabOrder
              onPress={() => goTo(position)}
              className="relative grid h-s16 min-w-0 flex-1 cursor-pointer place-items-center outline-none"
            >
              <span
                className={cx(
                  'block size-1.5 rounded-capsule',
                  item.items.length > 0 ? 'bg-fg-tertiary' : 'bg-line',
                )}
              />
              {position === index ? (
                <motion.span
                  layoutId={pillId}
                  transition={reduced ? { duration: 0 } : PILL_SPRING}
                  className="absolute inset-0 m-auto h-1.5 w-4 rounded-capsule bg-brand"
                />
              ) : null}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
