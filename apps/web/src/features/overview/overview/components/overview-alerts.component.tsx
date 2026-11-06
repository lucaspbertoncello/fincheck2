import { Icon, LinkButton } from '@fincheck/ui';

import type { OverviewAlert } from '#/features/overview/overview/overview.model.ts';

type OverviewAlertsProps = {
  alerts: OverviewAlert[];
};

/** Exception notices of the Visão geral (a connection with error, a late recurrence): a notice with a real button. */
export function OverviewAlerts({ alerts }: OverviewAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <ul aria-label="Avisos" className="m-0 flex list-none flex-col gap-s8 p-0">
      {alerts.map((alert) => (
        <li
          key={alert.key}
          className="flex items-center gap-s12 rounded-panel bg-caution-weak px-s16 py-s8"
        >
          <Icon name="warning" size="md" className="shrink-0 text-caution" />
          <span className="min-w-0 flex-1 text-label text-fg-primary">{alert.message}</span>
          <LinkButton href={alert.href} variant="secondary" size="sm" className="shrink-0">
            Ver
          </LinkButton>
        </li>
      ))}
    </ul>
  );
}
