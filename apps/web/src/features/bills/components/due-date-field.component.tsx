import {
  getLocalTimeZone,
  parseDate,
  today as todayIn,
  type CalendarDate,
} from '@internationalized/date';
import { FieldSet, Icon } from '@fincheck/ui';
import { useState } from 'react';
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Dialog,
  DialogTrigger,
  Heading,
  I18nProvider,
  Popover,
  ToggleButton,
} from 'react-aria-components';

import { CHIP_CLASS, CHIP_ON_CLASS } from '#/features/bills/constants/chip-class.constant.ts';
import { formatFullDate } from '#/features/bills/utils/format-full-date.util.ts';

type DueDateFieldProps = {
  label: string;
  /** Business date `YYYY-MM-DD`, or an empty text for "sem vencimento". */
  value: string;
  onChange: (value: string) => void;
  /** Today as `YYYY-MM-DD`. Defaults to the local day; pass it to freeze the screen in tests. */
  today?: string;
  error?: string;
};

function toCalendarDate(value: string): CalendarDate | null {
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

const ARROW_CLASS =
  'focus-ring grid size-ctl-touch cursor-pointer place-items-center rounded-capsule text-fg-secondary data-[hovered]:bg-subtle data-[hovered]:text-fg-primary';

/**
 * The due date of a bill as the choices people make: today, tomorrow, in a week, another day from
 * a calendar, or no due date at all (the bill then stays out of the Livre). The last chip shows
 * the chosen date when it is none of the shortcuts, so the date is always readable. Calendar in
 * pt-BR, same popover as `DateQuickField`.
 */
export function DueDateField({ label, value, onChange, today, error }: DueDateFieldProps) {
  const [open, setOpen] = useState(false);
  const todayDate = (today ? toCalendarDate(today) : null) ?? todayIn(getLocalTimeZone());
  const chosen = toCalendarDate(value);

  const shortcuts = [
    { label: 'Hoje', date: todayDate },
    { label: 'Amanhã', date: todayDate.add({ days: 1 }) },
    { label: 'Em 7 dias', date: todayDate.add({ days: 7 }) },
  ];
  const isShortcut = shortcuts.some((shortcut) => chosen?.compare(shortcut.date) === 0);
  const isOther = chosen !== null && !isShortcut;

  return (
    <I18nProvider locale="pt-BR">
      <FieldSet label={label} aside="opcional" error={error}>
        <div className="flex flex-wrap gap-s8">
          <ToggleButton
            isSelected={chosen === null}
            onChange={() => onChange('')}
            className={`${CHIP_CLASS} ${chosen === null ? CHIP_ON_CLASS : ''}`}
          >
            Sem vencimento
          </ToggleButton>
          {shortcuts.map((shortcut) => {
            const selected = chosen?.compare(shortcut.date) === 0;
            return (
              <ToggleButton
                key={shortcut.label}
                isSelected={selected}
                onChange={() => onChange(shortcut.date.toString())}
                className={`${CHIP_CLASS} ${selected ? CHIP_ON_CLASS : ''}`}
              >
                {shortcut.label}
              </ToggleButton>
            );
          })}
          <DialogTrigger isOpen={open} onOpenChange={setOpen}>
            <AriaButton
              aria-pressed={isOther}
              className={`${CHIP_CLASS} tabular-nums ${isOther ? CHIP_ON_CLASS : ''}`}
            >
              <Icon name="calendar" size="md" />
              {isOther ? formatFullDate(value) : 'Outra data'}
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
                    <AriaButton slot="previous" aria-label="Mês anterior" className={ARROW_CLASS}>
                      <Icon name="chevron-down" size="sm" className="rotate-90" />
                    </AriaButton>
                    <Heading className="text-label font-emphasis text-fg-primary capitalize" />
                    <AriaButton slot="next" aria-label="Próximo mês" className={ARROW_CLASS}>
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
                          className={({ isSelected, isToday }) =>
                            [
                              'focus-ring mx-auto grid size-10 cursor-pointer place-items-center rounded-capsule text-label tabular-nums outline-none data-[outside-month]:hidden',
                              isSelected
                                ? 'bg-(image:--gradient-button) text-fg-on-accent'
                                : 'text-fg-primary data-[hovered]:bg-subtle',
                              isToday && !isSelected ? 'border border-brand text-brand' : '',
                            ].join(' ')
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
