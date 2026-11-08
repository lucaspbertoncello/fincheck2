import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The one place that names the time zone of the business (the app lives in Brazil).
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

// `en-CA` prints the date as `YYYY-MM-DD`.
const businessDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The day in America/Sao_Paulo of an instant (an ISO 8601 text or milliseconds since the epoch).
// It differs from the UTC day at night: 23:30 in São Paulo is already the next day in UTC.
export function businessDateOfInstant(instant: string | number): BusinessDate {
  const milliseconds = typeof instant === 'string' ? Date.parse(instant) : instant;

  return BusinessDate.of(businessDayFormat.format(milliseconds));
}
