import { afterEach, describe, expect, it, vi } from 'vitest';

import { startRecurrencesSchedule } from '#/main/schedules/recurrences.schedule.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

function movableClock(start: string) {
  let now = Date.parse(start);
  const clock: Clock = new SystemClock(() => now);

  return {
    clock,
    moveTo(instant: string) {
      now = Date.parse(instant);
    },
  };
}

describe('startRecurrencesSchedule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once before it answers', async () => {
    const execute = vi.fn(() => Promise.resolve());

    const schedule = await startRecurrencesSchedule({
      ensureOccurrences: { execute },
      clock: createFixedClock('2026-10-22T15:00:00.000Z'),
    });
    schedule.stop();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('runs again on the first look of a new day in São Paulo, and not again on the same day', async () => {
    vi.useFakeTimers();
    const execute = vi.fn(() => Promise.resolve());
    const moving = movableClock('2026-10-31T23:00:00.000Z');
    const schedule = await startRecurrencesSchedule({
      ensureOccurrences: { execute },
      clock: moving.clock,
      checkEveryMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(5000);
    expect(execute).toHaveBeenCalledTimes(1);

    // 23:59 of the 31st in São Paulo: the same day.
    moving.moveTo('2026-11-01T02:59:00.000Z');
    await vi.advanceTimersByTimeAsync(2000);
    expect(execute).toHaveBeenCalledTimes(1);

    // Midnight in São Paulo: a new day.
    moving.moveTo('2026-11-01T03:00:00.000Z');
    await vi.advanceTimersByTimeAsync(2000);
    expect(execute).toHaveBeenCalledTimes(2);

    schedule.stop();
  });

  it('tries again on every look after a failure, and logs it once a day', async () => {
    vi.useFakeTimers();
    const execute = vi.fn(() => Promise.reject(new Error('the database is gone')));
    const messages: string[] = [];
    const moving = movableClock('2026-10-22T15:00:00.000Z');
    const schedule = await startRecurrencesSchedule({
      ensureOccurrences: { execute },
      clock: moving.clock,
      checkEveryMs: 1000,
      log: (message) => messages.push(message),
    });

    await vi.advanceTimersByTimeAsync(5000);
    expect(execute.mock.calls.length).toBeGreaterThan(4);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('the database is gone');

    // Another day, another line.
    moving.moveTo('2026-10-23T15:00:00.000Z');
    await vi.advanceTimersByTimeAsync(3000);
    expect(messages).toHaveLength(2);

    schedule.stop();
  });

  it('stops trying once it works', async () => {
    vi.useFakeTimers();
    let failures = 2;
    const execute = vi.fn(() =>
      failures-- > 0 ? Promise.reject(new Error('busy')) : Promise.resolve(),
    );
    const schedule = await startRecurrencesSchedule({
      ensureOccurrences: { execute },
      clock: createFixedClock('2026-10-22T15:00:00.000Z'),
      checkEveryMs: 1000,
      log: () => undefined,
    });

    await vi.advanceTimersByTimeAsync(10_000);

    expect(execute).toHaveBeenCalledTimes(3);
    schedule.stop();
  });

  it('stops: no more runs after `stop`', async () => {
    vi.useFakeTimers();
    const execute = vi.fn(() => Promise.resolve());
    const moving = movableClock('2026-10-22T15:00:00.000Z');
    const schedule = await startRecurrencesSchedule({
      ensureOccurrences: { execute },
      clock: moving.clock,
      checkEveryMs: 1000,
    });
    schedule.stop();

    moving.moveTo('2026-11-01T03:00:00.000Z');
    await vi.advanceTimersByTimeAsync(5000);

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
