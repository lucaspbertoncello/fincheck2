import { afterEach, vi } from 'vitest';
import { FIXED_NOW } from '#tests/support/clock/fixed-now.constant.ts';

// Every web test sees the same "today" (`FIXED_NOW`).
// Only `Date` is faked, and it keeps ticking from the fixed start (`shouldAdvanceTime`), so elapsed-time code such as
// timeouts still works. Timeouts, promises, Testing Library and MSW run on the real clock.
// This file is the first setup file on purpose: the mock seed reads the clock when it is imported.

function freezeClock() {
  vi.useFakeTimers({ toFake: ['Date'], now: FIXED_NOW, shouldAdvanceTime: true });
}

freezeClock();

// A test that turns the timers back to real (`vi.useRealTimers()`) must not leak the real date to the next one.
afterEach(() => {
  if (!vi.isFakeTimers()) freezeClock();
});
