import { BUSINESS_TIME_ZONE } from '#/shared/date/business-time-zone.constant.ts';

const businessClockFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// The wall clock in America/Sao_Paulo at an instant, as numbers (`month` is 1 to 12).
export function businessTimeOfInstant(instant: string | number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const milliseconds = typeof instant === 'string' ? Date.parse(instant) : instant;
  const parts = new Map(
    businessClockFormat.formatToParts(milliseconds).map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.get('year') ?? 0,
    month: parts.get('month') ?? 0,
    day: parts.get('day') ?? 0,
    hour: parts.get('hour') ?? 0,
    minute: parts.get('minute') ?? 0,
    second: parts.get('second') ?? 0,
  };
}
