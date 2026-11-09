import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';

import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { computeDaysLate } from '#/modules/dashboard/domain/month-summary/compute-days-late.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The amber line below "Faltam N dias": nothing in it when nothing is out of the ordinary. Order:
// a connection with an error, data that stopped, a recurrence that is late (the most days first).
// The connection ones are about now, so they come only in the current month; the late ones of the
// month asked come always. `daysLate` counts from the end of the window of the occurrence.
export function buildMonthAlerts(input: {
  isCurrentMonth: boolean;
  today: BusinessDate;
  connections: {
    connectionId: string;
    institutionName: string;
    status: 'active' | 'error' | 'disconnected';
    isStale: boolean;
  }[];
  occurrences: AgendaOccurrence[];
}): MonthSummary.Alert[] {
  const nothing = {
    connectionId: null,
    institutionName: null,
    occurrenceId: null,
    recurrenceName: null,
    daysLate: null,
  };
  const connection = (
    type: 'connection_error' | 'stale_data',
    source: (typeof input.connections)[number],
  ) => ({
    ...nothing,
    type,
    connectionId: source.connectionId,
    institutionName: source.institutionName,
  });

  const errors = input.isCurrentMonth
    ? input.connections
        .filter((item) => item.status === 'error')
        .map((item) => connection('connection_error', item))
    : [];
  const stale = input.isCurrentMonth
    ? input.connections
        .filter((item) => item.status === 'active' && item.isStale)
        .map((item) => connection('stale_data', item))
    : [];
  const late = input.occurrences
    .filter((occurrence) => occurrence.status === 'late')
    .map((occurrence) => ({
      ...nothing,
      type: 'late_occurrence' as const,
      occurrenceId: occurrence.id,
      recurrenceName: occurrence.recurrenceName,
      daysLate: computeDaysLate(occurrence.windowEndOn, input.today),
    }))
    .toSorted((a, b) => b.daysLate - a.daysLate || a.occurrenceId.localeCompare(b.occurrenceId));

  return [...errors, ...stale, ...late];
}
