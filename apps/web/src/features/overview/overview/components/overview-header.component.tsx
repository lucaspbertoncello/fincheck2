import { DateLine, InlineNotice, MonthPicker, PageHeader, RemainingLine } from '@fincheck/ui';
import type { RemainingLineData } from '@fincheck/ui';

import type { OverviewAlert } from '#/features/overview/overview/overview.model.ts';

type OverviewHeaderProps = {
  monthLabel: string;
  yearLabel: string;
  dateIcon: 'sunrise' | 'sun' | 'sunset' | 'moon';
  dateText: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  remaining: { isVisible: boolean; data: RemainingLineData | undefined };
  alerts: OverviewAlert[];
};

/** Header of the Visão geral: title, date, "Faltam N dias" line, the exception lines and the month picker. */
export function OverviewHeader({
  monthLabel,
  yearLabel,
  dateIcon,
  dateText,
  onPreviousMonth,
  onNextMonth,
  remaining,
  alerts,
}: OverviewHeaderProps) {
  const hasExtra = remaining.isVisible || alerts.length > 0;

  return (
    <PageHeader
      title="Visão geral"
      date={<DateLine icon={dateIcon} text={dateText} />}
      extra={
        hasExtra ? (
          <div className="flex flex-col gap-s8">
            {remaining.isVisible ? <RemainingLine data={remaining.data} /> : null}
            {alerts.map((alert) => (
              <InlineNotice key={alert.key} href={alert.href} linkLabel="ver">
                {alert.message}
              </InlineNotice>
            ))}
          </div>
        ) : undefined
      }
      actions={
        <MonthPicker
          monthLabel={monthLabel}
          yearLabel={yearLabel}
          onPrevious={onPreviousMonth}
          onNext={onNextMonth}
        />
      }
    />
  );
}
