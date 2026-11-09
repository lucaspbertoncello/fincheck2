import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { ArrowButton } from '#/components/buttons/arrow-button.component.tsx';
import { PeriodMenu } from '#/components/page/period-menu.component.tsx';
import type { PeriodMenuProps } from '#/components/page/period-menu.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type MonthPickerPeriod = PeriodMenuProps & {
  /**
   * What takes the place of the month when the period is not one ("dez 2025 – nov 2026", "2026",
   * "Tudo"); null while the period is the month.
   */
  rangeLabel: string | null;
};

type MonthPickerProps = {
  /** "Outubro". Ignored when `unit` is "year". */
  monthLabel: string;
  /** "2026". */
  yearLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /**
   * What one arrow press moves: a month (the default) or a year. In "year" only the year shows and
   * the arrows read "Ano anterior" and "Próximo ano" (the Mês | Ano map of Perfil).
   */
  unit?: 'month' | 'year';
  /** Stops the arrows at an end ("not past the current month"): dimmed, no press, no focus. */
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  /** Only where the screen reads wider periods (Transações): adds the period button. */
  period?: MonthPickerPeriod;
};

type Direction = 1 | -1;

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
 * text color; the text is 14 px (the label size) on every width, regular (components.md 1.5). Screen readers hear the month in a polite live region; the
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
  unit = 'month',
  isPreviousDisabled,
  isNextDisabled,
  period,
}: MonthPickerProps) {
  const [direction, setDirection] = useState<Direction>(1);
  const reduced = useReducedMotion();
  const variants = reduced ? FADE_VARIANTS : SLIDE_VARIANTS;
  const rangeLabel = period?.rangeLabel ?? null;
  const isYear = unit === 'year';
  const spoken = rangeLabel ?? (isYear ? yearLabel : `${monthLabel} ${yearLabel}`);

  function handlePrevious() {
    setDirection(-1);
    onPrevious();
  }

  function handleNext() {
    setDirection(1);
    onNext();
  }

  return (
    <div role="group" aria-label={isYear ? 'Ano' : 'Mês'} className="flex items-center gap-s4">
      <ArrowButton
        direction="previous"
        label={isYear ? 'Ano anterior' : 'Mês anterior'}
        onPress={handlePrevious}
        isDisabled={isPreviousDisabled}
        className={cx(rangeLabel && 'invisible')}
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {spoken}
      </span>
      <span
        aria-hidden="true"
        className="grid overflow-hidden text-center text-label whitespace-nowrap text-fg-secondary"
      >
        <span className="invisible col-start-1 row-start-1 grid">
          {isYear ? (
            <span className="col-start-1 row-start-1 tabular-nums">0000</span>
          ) : (
            MONTH_NAMES.map((name) => (
              <span key={name} className="col-start-1 row-start-1 tabular-nums">
                {name} {yearLabel}
              </span>
            ))
          )}
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
            ) : isYear ? (
              <span className="font-plain tabular-nums">{yearLabel}</span>
            ) : (
              <>
                <span className="font-title font-plain">{monthLabel}</span>{' '}
                <span className="font-plain tabular-nums">{yearLabel}</span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <ArrowButton
        direction="next"
        label={isYear ? 'Próximo ano' : 'Próximo mês'}
        onPress={handleNext}
        isDisabled={isNextDisabled}
        className={cx(rangeLabel && 'invisible')}
      />
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
