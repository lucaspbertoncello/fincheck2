import { DateLine, MonthPicker, PageHeader, RemainingLine } from '@fincheck/ui';

import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';
import { formatPageDate } from '#/shared/utils/format-page-date.util.ts';
import { getTimeOfDayIcon } from '#/shared/utils/get-time-of-day-icon.util.ts';

type ScreenHeaderProps = {
  screen: ScreenDefinition;
};

/**
 * Header of a page: title with the card dot, the date line and, where the month filters, the
 * month picker. The Visão geral also has the "Faltam N dias" line, which has no data yet.
 */
export function ScreenHeader({ screen }: ScreenHeaderProps) {
  const now = new Date();
  const month = useSelectedMonth();

  return (
    <PageHeader
      title={screen.title}
      date={<DateLine icon={getTimeOfDayIcon(now)} text={formatPageDate(now)} />}
      extra={screen.key === 'overview' ? <RemainingLine /> : undefined}
      actions={
        screen.filtersByMonth ? (
          <MonthPicker
            monthLabel={month.monthLabel}
            yearLabel={month.yearLabel}
            onPrevious={month.goToPrevious}
            onNext={month.goToNext}
          />
        ) : undefined
      }
    />
  );
}
