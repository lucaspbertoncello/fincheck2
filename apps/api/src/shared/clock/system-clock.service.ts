import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

// `en-CA` prints the date as `YYYY-MM-DD`.
const businessDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// The real clock. `readTime` returns milliseconds since the epoch; a test passes a fixed one.
export class SystemClock implements Clock {
  private readonly readTime: () => number;

  constructor(readTime: () => number = Date.now) {
    this.readTime = readTime;
  }

  now(): string {
    return new Date(this.readTime()).toISOString();
  }

  today(): BusinessDate {
    return BusinessDate.of(businessDayFormat.format(this.readTime()));
  }
}
