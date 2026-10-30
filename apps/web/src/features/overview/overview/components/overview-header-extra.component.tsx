import { InlineNotice, RemainingLine } from '@fincheck/ui';
import type { RemainingLineData } from '@fincheck/ui';

import type { OverviewAlert } from '#/features/overview/overview/overview.model.ts';

type OverviewHeaderExtraProps = {
  remaining: { isVisible: boolean; data: RemainingLineData | undefined };
  alerts: OverviewAlert[];
};

/** The lines under the date of the Visão geral: "Faltam N dias" and the exception lines. */
export function OverviewHeaderExtra({ remaining, alerts }: OverviewHeaderExtraProps) {
  if (!remaining.isVisible && alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-s8">
      {remaining.isVisible ? <RemainingLine data={remaining.data} /> : null}
      {alerts.map((alert) => (
        <InlineNotice key={alert.key} href={alert.href} linkLabel="ver">
          {alert.message}
        </InlineNotice>
      ))}
    </div>
  );
}
