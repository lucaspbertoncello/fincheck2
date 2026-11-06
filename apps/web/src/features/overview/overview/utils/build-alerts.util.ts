import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';

import type { OverviewAlert } from '#/features/overview/overview/overview.model.ts';

/** The exception line shows at most this many alerts; the first ones are the most urgent. */
const MAX_ALERTS = 2;

function describeDaysLate(daysLate: number | null): string {
  if (!daysLate) return '';
  return ` ${daysLate} ${daysLate === 1 ? 'dia' : 'dias'}`;
}

function describe(alert: MonthSummary.Alert): string {
  if (alert.type === 'connection_error') {
    return `Conexão com erro no ${alert.institutionName ?? 'banco'}`;
  }
  return `${alert.recurrenceName ?? 'Recorrência'} atrasado${describeDaysLate(alert.daysLate)}`;
}

/**
 * Texts and targets of the amber notices. Connection problems go to Configurações, late items to
 * Recorrentes. Stale data is not an alert here: the account row and its date already say it
 * (Polimento 13, item 10).
 */
export function buildAlerts(
  alerts: readonly MonthSummary.Alert[],
  hrefs: { settings: string; recurrences: string },
): OverviewAlert[] {
  return alerts
    .filter((alert) => alert.type !== 'stale_data')
    .slice(0, MAX_ALERTS)
    .map((alert, index) => ({
      key: `${alert.type}:${alert.connectionId ?? alert.occurrenceId ?? index}`,
      message: describe(alert),
      href: alert.type === 'late_occurrence' ? hrefs.recurrences : hrefs.settings,
    }));
}
