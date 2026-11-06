import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// A clock stopped at `instant` (ISO 8601). `today()` still answers in America/Sao_Paulo.
export function createFixedClock(instant: string): SystemClock {
  const time = Date.parse(instant);

  return new SystemClock(() => time);
}
