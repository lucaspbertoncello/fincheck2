import { vi } from 'vitest';

import { resetMockDatabase } from '#mocks/state/mock-database.store.ts';
import { setMockClock } from '#mocks/support/dates/mock-clock.store.ts';
import { FIXED_NOW } from '#tests/support/clock/fixed-now.constant.ts';

// Moves "today" for one test (the last day of a month, the 1st) and rebuilds the mock seed for it.
// Pair it with `restoreTestClock` in `afterEach`.
export function setTestClock(now: Date): void {
  vi.setSystemTime(now);
  setMockClock(now);
  resetMockDatabase();
}

// Back to the fixed day of every test, with the seed rebuilt for it.
export function restoreTestClock(): void {
  setTestClock(FIXED_NOW);
}
