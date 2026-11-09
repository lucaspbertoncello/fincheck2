import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// A clock a test moves: it stands at `start` until `moveTo` sets another instant.
export function createMovableClock(start: string): {
  clock: Clock;
  moveTo: (instant: string) => void;
} {
  let now = Date.parse(start);

  return {
    clock: new SystemClock(() => now),
    moveTo: (instant: string) => {
      now = Date.parse(instant);
    },
  };
}
