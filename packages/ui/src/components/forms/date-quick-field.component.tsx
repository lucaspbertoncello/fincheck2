import {
  getLocalTimeZone,
  parseDate,
  today as todayIn,
  type CalendarDate,
} from '@internationalized/date';
import { useState } from 'react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DialogTrigger,
  Dialog,
  Heading,
  I18nProvider,
  Popover,
  ToggleButton,
} from 'react-aria-components';

import { FieldSet } from '#/components/forms/field-set.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type DateQuickFieldProps = {
  label: string;
  /** Business date `YYYY-MM-DD`, or an empty text while there is none. */
  value: string;
  onChange: (value: string) => void;
  /** Today as `YYYY-MM-DD`. Defaults to the local day; pass it to freeze the screen in tests. */
  today?: string;
  error?: string;
  className?: string;
};

const CHIP_CLASS =
  'focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s8 rounded-capsule border border-line px-s16 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96 data-[hovered]:bg-subtle';
const CHIP_ON_CLASS = 'border-brand bg-brand-weak text-brand';

function toCalendarDate(value: string): CalendarDate | null {
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/** `12/10/2026`: day first, as in the rest of the app. */
function formatDate(date: CalendarDate): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
}

/**
 * Date as the choice people actually make: "Hoje", "Ontem", or another day from a calendar. The
 * third chip shows the chosen date when it is neither, so the date is always readable. Calendar in
 * pt-BR (weeks from Sunday), popover with the glass of the menus; arrows move by day, PageUp and
 * PageDown by month. For typing a date, use `EditDateField`.
 */
export function DateQuickField({
  label,
  value,
  onChange,
  today,
  error,
  className,
}: DateQuickFieldProps) {
  const [open, setOpen] = useState(false);
  const todayDate = (today ? toCalendarDate(today) : null) ?? todayIn(getLocalTimeZone());
  const yesterday = todayDate.subtract({ days: 1 });
  const chosen = toCalendarDate(value);

  const isToday = chosen?.compare(todayDate) === 0;
  const isYesterday = chosen?.compare(yesterday) === 0;
  const isOther = chosen !== null && !isToday && !isYesterday;

  return (
    <I18nProvider locale="pt-BR">
      <FieldSet label={label} error={error} className={className}>
        <div className="flex flex-wrap gap-s8">
          <ToggleButton
            isSelected={isToday}
            onChange={() => onChange(todayDate.toString())}
            className={cx(CHIP_CLASS, isToday && CHIP_ON_CLASS)}
          >
            Hoje
          </ToggleButton>
          <ToggleButton
            isSelected={isYesterday}
            onChange={() => onChange(yesterday.toString())}
            className={cx(CHIP_CLASS, isYesterday && CHIP_ON_CLASS)}
          >
            Ontem
          </ToggleButton>
          <DialogTrigger isOpen={open} onOpenChange={setOpen}>
            <AriaButton
              aria-pressed={isOther}
              className={cx(CHIP_CLASS, 'tabular-nums', isOther && CHIP_ON_CLASS)}
            >
              <Icon name="calendar" size="md" />
              {isOther && chosen ? formatDate(chosen) : 'Outra data'}
            </AriaButton>
            <Popover
              placement="bottom start"
              className="popover-enter rounded-panel border border-line bg-menu p-s16 shadow-(--shadow-menu) backdrop-blur-(--blur-popover)"
            >
              <Dialog aria-label={`${label}: escolher no calendário`} className="outline-none">
                <Calendar
                  aria-label={label}
                  value={chosen}
                  onChange={(date) => {
                    onChange(date.toString());
                    setOpen(false);
                  }}
                  className="flex w-72 flex-col gap-s8"
                >
                  <header className="flex items-center justify-between">
                    <AriaButton
                      slot="previous"
                      aria-label="Mês anterior"
                      className="focus-ring grid size-ctl-touch cursor-pointer place-items-center rounded-capsule text-fg-secondary data-[hovered]:bg-subtle data-[hovered]:text-fg-primary"
                    >
                      <Icon name="chevron-down" size="sm" className="rotate-90" />
                    </AriaButton>
                    <Heading className="text-label font-emphasis text-fg-primary capitalize" />
                    <AriaButton
                      slot="next"
                      aria-label="Próximo mês"
                      className="focus-ring grid size-ctl-touch cursor-pointer place-items-center rounded-capsule text-fg-secondary data-[hovered]:bg-subtle data-[hovered]:text-fg-primary"
                    >
                      <Icon name="chevron-down" size="sm" className="-rotate-90" />
                    </AriaButton>
                  </header>
                  <CalendarGrid className="w-full border-separate border-spacing-0">
                    <CalendarGridHeader>
                      {(day) => (
                        <CalendarHeaderCell className="pb-s8 text-center text-caption font-plain text-fg-tertiary capitalize">
                          {day}
                        </CalendarHeaderCell>
                      )}
                    </CalendarGridHeader>
                    <CalendarGridBody>
                      {(date) => (
                        <CalendarCell
                          date={date}
                          className={({ isSelected, isToday: cellIsToday }) =>
                            cx(
                              'focus-ring mx-auto grid size-10 cursor-pointer place-items-center rounded-capsule text-label tabular-nums outline-none data-[outside-month]:hidden',
                              isSelected
                                ? 'bg-(image:--gradient-button) text-fg-on-accent'
                                : 'text-fg-primary data-[hovered]:bg-subtle',
                              cellIsToday && !isSelected && 'border border-brand text-brand',
                            )
                          }
                        />
                      )}
                    </CalendarGridBody>
                  </CalendarGrid>
                </Calendar>
              </Dialog>
            </Popover>
          </DialogTrigger>
        </div>
      </FieldSet>
    </I18nProvider>
  );
}
