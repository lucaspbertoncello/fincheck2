import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

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
    return businessDateOfInstant(this.readTime());
  }
}
