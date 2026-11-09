import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startBackupSchedule } from '#/main/schedules/backup.schedule.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

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

// 03:00 in São Paulo is 06:00 UTC.
describe('startBackupSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once when the API starts, whatever the hour (the PC was off at 03:00)', async () => {
    const execute = vi.fn(async () => undefined);
    const moving = movableClock('2026-11-08T05:00:00.000Z');

    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock });
    await schedule.startup;
    schedule.stop();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not run before 03:00; from 03:00 on it looks once an hour', async () => {
    const execute = vi.fn(async () => undefined);
    const moving = movableClock('2026-11-08T05:00:00.000Z');
    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock });
    await schedule.startup;
    expect(execute).toHaveBeenCalledTimes(1);

    moving.moveTo('2026-11-08T05:59:00.000Z');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(execute).toHaveBeenCalledTimes(1);

    // 03:00 in São Paulo, an hour after the start: its look.
    moving.moveTo('2026-11-08T06:00:00.000Z');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(2);

    // Not again within the hour.
    moving.moveTo('2026-11-08T06:50:00.000Z');
    await vi.advanceTimersByTimeAsync(600_000);
    expect(execute).toHaveBeenCalledTimes(2);

    moving.moveTo('2026-11-08T07:01:00.000Z');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(3);

    // The next day, after 03:00.
    moving.moveTo('2026-11-09T06:01:00.000Z');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(4);

    schedule.stop();
  });

  it('tries again an hour after a failure (a disk that was off at 03:00 and is on at 09:00)', async () => {
    const execute = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('disk off'))
      .mockResolvedValue(undefined);
    const log = vi.fn();
    const moving = movableClock('2026-11-08T12:00:00.000Z');
    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock, log });
    await schedule.startup;
    expect(execute).toHaveBeenCalledTimes(1);

    moving.moveTo('2026-11-08T12:30:00.000Z');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(1);

    moving.moveTo('2026-11-08T13:01:00.000Z');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('backup schedule: disk off');

    schedule.stop();
  });

  it('counts the start as an attempt: no second look within the hour', async () => {
    const execute = vi.fn(async () => undefined);
    const moving = movableClock('2026-11-08T15:00:00.000Z');
    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock });
    await schedule.startup;

    await vi.advanceTimersByTimeAsync(600_000);

    expect(execute).toHaveBeenCalledTimes(1);
    schedule.stop();
  });

  it('logs a failure and does not try again every minute', async () => {
    const execute = vi.fn(async () => {
      throw new Error('disk gone');
    });
    const log = vi.fn();
    const moving = movableClock('2026-11-08T15:00:00.000Z');
    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock, log });
    await schedule.startup;

    await vi.advanceTimersByTimeAsync(600_000);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('backup schedule: disk gone');
    schedule.stop();
  });

  it('holds back while paused and goes on after', async () => {
    const execute = vi.fn(async () => undefined);
    let paused = true;
    const moving = movableClock('2026-11-08T05:00:00.000Z');
    const schedule = startBackupSchedule({
      runDailyBackup: { execute },
      clock: moving.clock,
      isPaused: () => paused,
    });
    await schedule.startup;
    expect(execute).not.toHaveBeenCalled();

    moving.moveTo('2026-11-08T06:30:00.000Z');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(execute).not.toHaveBeenCalled();

    paused = false;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(1);

    schedule.stop();
  });

  it('stops: no more runs after `stop`', async () => {
    const execute = vi.fn(async () => undefined);
    const moving = movableClock('2026-11-08T05:00:00.000Z');
    const schedule = startBackupSchedule({ runDailyBackup: { execute }, clock: moving.clock });
    await schedule.startup;
    schedule.stop();

    moving.moveTo('2026-11-09T06:30:00.000Z');
    await vi.advanceTimersByTimeAsync(600_000);

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
