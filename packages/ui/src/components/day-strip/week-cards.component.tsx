import { motion } from 'motion/react';
import { Button } from 'react-aria-components';

import { dayRangeLabel } from '#/components/day-strip/day-date.util.ts';
import type { WeekSummary } from '#/components/day-strip/day-strip.type.ts';
import { ProjectionFigures } from '#/components/day-strip/projection-figures.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type WeekCardsProps<TItem> = {
  weeks: readonly WeekSummary<TItem>[];
  /** Pressing a week opens its first day in the "Dia" view. */
  onSelectWeek: (week: WeekSummary<TItem>) => void;
  /** Accessible name of the list ("Semanas até o fim do mês"). */
  label: string;
};

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] as const } },
};

/**
 * "Semana" view of "Até o fim do mês" (BR-DSH-014): the weeks that are left, each one a card with
 * what comes in, what goes out and the projected balance at the end of the week. The week that
 * holds today is marked. The cards enter one after the other (opacity and 8 px of lift, 200 ms);
 * with reduced motion the lift goes away and only the fade stays.
 */
export function WeekCards<TItem>({ weeks, onSelectWeek, label }: WeekCardsProps<TItem>) {
  return (
    <motion.ul
      aria-label={label}
      variants={LIST_VARIANTS}
      initial="hidden"
      animate="visible"
      className="m-0 grid list-none gap-s12 p-0 sm:grid-cols-2 lg:grid-cols-3"
    >
      {weeks.map((week) => {
        const range = dayRangeLabel(week.startDate, week.endDate);

        return (
          <motion.li key={week.key} variants={CARD_VARIANTS} className="flex">
            <Button
              aria-label={`${week.isCurrent ? 'Esta semana, ' : ''}${range}. Ver os dias`}
              onPress={() => onSelectWeek(week)}
              className={cx(
                'flex w-full cursor-pointer flex-col gap-s16 rounded-panel border bg-glass p-s16 text-left outline-none',
                'transition-[background-color,border-color,transform] duration-(--duration-fast) motion-reduce:transition-none',
                'data-[hovered]:bg-brand-weak data-[pressed]:scale-98 data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand',
                week.isCurrent ? 'border-brand' : 'border-line',
              )}
            >
              <span className="flex flex-wrap items-center justify-between gap-x-s8 gap-y-s4">
                <span className="font-title text-label font-heading text-fg-primary">{range}</span>
                {week.isCurrent ? (
                  <span className="rounded-capsule bg-brand-weak px-s8 py-s4 text-meta font-emphasis text-brand">
                    Esta semana
                  </span>
                ) : null}
              </span>
              <ProjectionFigures
                inCents={week.inCents}
                outCents={week.outCents}
                balanceCents={week.endBalanceCents}
                balanceLabel="Saldo ao fim"
                layout="rows"
                className="text-money-sm"
              />
            </Button>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
