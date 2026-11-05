import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Button } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { PeriodMenu, type PeriodMenuProps } from '#/components/page/period-menu.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type MonthPickerPeriod = PeriodMenuProps & {
  /**
   * What takes the place of the month when the period is not one ("dez 2025 – nov 2026", "2026",
   * "Tudo"); null while the period is the month.
   */
  rangeLabel: string | null;
};

type MonthPickerProps = {
  /** "Outubro". */
  monthLabel: string;
  /** "2026". */
  yearLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Only where the screen reads wider periods (Transações): adds the period button. */
  period?: MonthPickerPeriod;
};

type Direction = 1 | -1;

const ARROW =
  'group relative grid size-ctl-sm shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary outline-none transition-[background-color,color,transform] duration-(--duration-fast) after:absolute after:-inset-1.5 after:content-[""] data-[hovered]:bg-brand-weak data-[hovered]:text-brand data-[pressed]:scale-94 data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand lg:size-8';

/** Every month name, so the window is as wide as the widest one and the arrows never move. */
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** The widest a range can be ("mmm" is the widest month abbreviation), so any range fits the same window. */
const RANGE_SIZER = 'mmm 0000 – mmm 0000';

const SLIDE_EASE = [0.2, 0, 0, 1] as const;
const SLIDE_SECONDS = 0.28;
const FADE_SECONDS = 0.12;

/** Slide: the leaving month goes out one side, the next one comes in from the other, 100% of the window. */
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

/**
 * "‹ Outubro 2026 ›". The arrows sit in fixed places: the window between them is as wide as the
 * widest month (an invisible sizer holds all twelve), so no month name pushes them. A month
 * change is a slider: the text leaves and enters sliding in the direction of the move, clipped
 * to the window so it never passes over the arrows. Month, year and arrows share the secondary
 * text color; the text is 14 px on the phone and 15 px on the desktop, regular (components.md 1.5). Screen readers hear the month in a polite live region; the
 * animated text is hidden from them.
 *
 * With `period` (Transações) the picker also holds the period button. Out of the month the window
 * shows the range in the month's place, in the same width (the sizer also holds the widest range),
 * and the arrows step aside without leaving their places.
 */
export function MonthPicker({
  monthLabel,
  yearLabel,
  onPrevious,
  onNext,
  period,
}: MonthPickerProps) {
  const [direction, setDirection] = useState<Direction>(1);
  const reduced = useReducedMotion();
  const variants = reduced ? FADE_VARIANTS : SLIDE_VARIANTS;
  const rangeLabel = period?.rangeLabel ?? null;
  const spoken = rangeLabel ?? `${monthLabel} ${yearLabel}`;

  function handlePrevious() {
    setDirection(-1);
    onPrevious();
  }

  function handleNext() {
    setDirection(1);
    onNext();
  }

  return (
    <div role="group" aria-label="Mês" className="flex items-center gap-s4">
      <Button
        aria-label="Mês anterior"
        onPress={handlePrevious}
        className={cx(ARROW, rangeLabel && 'invisible')}
      >
        <Icon
          name="chevron-left"
          size="md"
          className="transition-transform duration-(--duration-fast) group-data-[hovered]:-translate-x-px"
        />
      </Button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {spoken}
      </span>
      <span
        aria-hidden="true"
        className="grid overflow-hidden text-center text-label whitespace-nowrap text-fg-secondary lg:text-list"
      >
        <span className="invisible col-start-1 row-start-1 grid">
          {MONTH_NAMES.map((name) => (
            <span key={name} className="col-start-1 row-start-1 tabular-nums">
              {name} {yearLabel}
            </span>
          ))}
          {period ? (
            <span className="col-start-1 row-start-1 tabular-nums">{RANGE_SIZER}</span>
          ) : null}
        </span>
        <AnimatePresence initial={false} custom={direction}>
          <motion.span
            key={spoken}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? FADE_SECONDS : SLIDE_SECONDS, ease: SLIDE_EASE }}
            className="col-start-1 row-start-1"
          >
            {rangeLabel ? (
              <span className="font-plain tabular-nums">{rangeLabel}</span>
            ) : (
              <>
                <span className="font-title font-plain">{monthLabel}</span>{' '}
                <span className="font-plain tabular-nums">{yearLabel}</span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <Button
        aria-label="Próximo mês"
        onPress={handleNext}
        className={cx(ARROW, rangeLabel && 'invisible')}
      >
        <Icon
          name="chevron-right"
          size="md"
          className="transition-transform duration-(--duration-fast) group-data-[hovered]:translate-x-px"
        />
      </Button>
      {period ? (
        <div className="ml-s8">
          <PeriodMenu
            options={period.options}
            value={period.value}
            onChange={period.onChange}
            monthKey={period.monthKey}
          />
        </div>
      ) : null}
    </div>
  );
}
