import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';

import type { OverviewAlert } from '#/features/overview/overview/overview.model.ts';

/** The exception line shows at most this many alerts; the first ones are the most urgent. */
export const MAX_ALERTS = 2;

function describeDaysLate(daysLate: number | null): string {
  if (!daysLate) return '';
  return ` ${daysLate} ${daysLate === 1 ? 'dia' : 'dias'}`;
}

function describe(alert: MonthSummary.Alert): string {
  if (alert.type === 'connection_error') {
    return `Conexão com erro no ${alert.institutionName ?? 'banco'}`;
  }
  if (alert.type === 'stale_data') {
    return `Dado do ${alert.institutionName ?? 'banco'} parado`;
  }
  return `${alert.recurrenceName ?? 'Recorrência'} atrasado${describeDaysLate(alert.daysLate)}`;
}

/** Texts and targets of the amber lines. Connection problems go to Configurações, late items to Recorrentes. */
export function buildAlerts(
  alerts: readonly MonthSummary.Alert[],
  hrefs: { settings: string; recurrences: string },
): OverviewAlert[] {
  return alerts.slice(0, MAX_ALERTS).map((alert, index) => ({
    key: `${alert.type}:${alert.connectionId ?? alert.occurrenceId ?? index}`,
    message: describe(alert),
    href: alert.type === 'late_occurrence' ? hrefs.recurrences : hrefs.settings,
  }));
}
