import { DateLine, MonthPicker, PageHeader } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';
import { formatPageDate } from '#/shared/utils/format-page-date.util.ts';
import { getTimeOfDayIcon } from '#/shared/utils/get-time-of-day-icon.util.ts';

type ScreenHeaderProps = {
  screen: ScreenDefinition;
  /** Content of the line under the date (the Visão geral puts "Faltam N dias" and its alerts here). */
  extra?: ReactNode;
  /** Takes the place of the month picker, for the screen that adds its own controls to it (Transações). */
  picker?: ReactNode;
};

/**
 * Header of a page: title with the card dot, the date line, an optional `extra` line and, where
 * the month filters, the month picker (or the `picker` the screen brings).
 */
export function ScreenHeader({ screen, extra, picker }: ScreenHeaderProps) {
  const now = new Date();
  const month = useSelectedMonth();

  return (
    <PageHeader
      title={screen.title}
      date={<DateLine icon={getTimeOfDayIcon(now)} text={formatPageDate(now)} />}
      extra={extra}
      actions={
        picker ??
        (screen.filtersByMonth ? (
          <MonthPicker
            monthLabel={month.monthLabel}
            yearLabel={month.yearLabel}
            onPrevious={month.goToPrevious}
            onNext={month.goToNext}
          />
        ) : undefined)
      }
    />
  );
}
