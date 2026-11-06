import { describe, expect, it } from 'vitest';

import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

describe('SystemClock', () => {
  it('reads the instant in UTC with milliseconds and Z', () => {
    const clock = createFixedClock('2026-11-06T15:30:45.123Z');

    expect(clock.now()).toBe('2026-11-06T15:30:45.123Z');
  });

  it('gives the São Paulo day at midday', () => {
    expect(createFixedClock('2026-11-06T15:00:00.000Z').today().value).toBe('2026-11-06');
  });

  it('still gives the previous day at 23:59 in São Paulo, when UTC is already the next one', () => {
    const clock = createFixedClock('2026-11-07T02:59:00.000Z'); // 23:59 in São Paulo (UTC-3)

    expect(clock.now()).toBe('2026-11-07T02:59:00.000Z');
    expect(clock.today().value).toBe('2026-11-06');
  });

  it('turns the day at midnight in São Paulo', () => {
    expect(createFixedClock('2026-11-07T03:00:00.000Z').today().value).toBe('2026-11-07');
  });

  it('turns the year at midnight in São Paulo, not in UTC', () => {
    expect(createFixedClock('2027-01-01T02:59:59.000Z').today().value).toBe('2026-12-31');
    expect(createFixedClock('2027-01-01T03:00:00.000Z').today().value).toBe('2027-01-01');
  });

  it('follows the real time when it is not given one', () => {
    const before = Date.now();
    const parsed = Date.parse(new SystemClock().now());

    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(Date.now());
  });
});
