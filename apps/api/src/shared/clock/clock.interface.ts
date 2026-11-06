import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The port to the time. The only place that knows the time zone: everything else asks the clock,
// so a test can freeze it.
export interface Clock {
  // The current instant: ISO 8601 in UTC with milliseconds and `Z`.
  now(): string;
  // The current day in America/Sao_Paulo (it differs from the UTC day at night).
  today(): BusinessDate;
}
