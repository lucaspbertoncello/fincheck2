import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startSyncSchedule } from '#/main/schedules/sync.schedule.ts';

describe('startSyncSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (
    options: { isPaused?: () => boolean; run?: () => Promise<{ ranCount: number }> } = {},
  ) => {
    const order: string[] = [];
    const logs: string[] = [];
    const run = vi.fn(async () => {
      order.push('run');

      return (options.run ?? (async () => ({ ranCount: 0 })))();
    });
    const recover = vi.fn(async () => {
      order.push('recover');

      return { recoveredCount: 0 };
    });

    return {
      order,
      logs,
      run,
      recover,
      start: () =>
        startSyncSchedule({
          runDue: { run },
          recover: { execute: recover },
          log: (message) => logs.push(message),
          ...(options.isPaused ? { isPaused: options.isPaused } : {}),
        }),
    };
  };

  it('closes the rounds the last process died in, and then looks at once (the round at start)', async () => {
    const world = setup();

    const schedule = await world.start();
    await schedule.initialRun;
    schedule.stop();

    expect(world.order).toEqual(['recover', 'run']);
  });

  it('looks again every minute', async () => {
    const world = setup();
    const schedule = await world.start();
    await schedule.initialRun;

    await vi.advanceTimersByTimeAsync(3 * 60_000);
    schedule.stop();

    expect(world.run).toHaveBeenCalledTimes(4);
  });

  it('does not hold the start of the API: the first look is its own promise', async () => {
    let finish: () => void = () => undefined;
    const world = setup({
      run: () => new Promise((resolve) => (finish = () => resolve({ ranCount: 1 }))),
    });

    const schedule = await world.start();
    expect(world.run).toHaveBeenCalledTimes(1);
    finish();
    await schedule.initialRun;
    schedule.stop();
  });

  it('while the backup restores the database (paused) no look runs, at start or after', async () => {
    const world = setup({ isPaused: () => true });

    const schedule = await world.start();
    await schedule.initialRun;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    schedule.stop();

    expect(world.run).not.toHaveBeenCalled();
  });

  it('runs again at the first look after the pause ends', async () => {
    let paused = true;
    const world = setup({ isPaused: () => paused });
    const schedule = await world.start();
    await schedule.initialRun;
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(world.run).not.toHaveBeenCalled();

    paused = false;
    await vi.advanceTimersByTimeAsync(60_000);
    schedule.stop();

    expect(world.run).toHaveBeenCalledTimes(1);
  });

  it('a look that finds the previous one still going does nothing: rounds never pile up', async () => {
    let finish: () => void = () => undefined;
    const world = setup({
      run: () => new Promise((resolve) => (finish = () => resolve({ ranCount: 1 }))),
    });
    const schedule = await world.start();

    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(world.run).toHaveBeenCalledTimes(1);
    finish();
    await schedule.initialRun;
    await vi.advanceTimersByTimeAsync(60_000);
    schedule.stop();

    expect(world.run).toHaveBeenCalledTimes(2);
  });

  it('a failure is logged by its name only, never the message, and the next look tries again', async () => {
    let calls = 0;
    const world = setup({
      run: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('secret detail: client-secret-test');

        return { ranCount: 1 };
      },
    });

    const schedule = await world.start();
    await schedule.initialRun;
    await vi.advanceTimersByTimeAsync(60_000);
    schedule.stop();

    expect(world.logs).toEqual(['sync schedule: TypeError']);
    expect(calls).toBe(2);
  });

  it('a failure of the recovery at start does not stop the schedule', async () => {
    const world = setup();
    world.recover.mockRejectedValueOnce(new RangeError('x'));

    const schedule = await world.start();
    await schedule.initialRun;
    schedule.stop();

    expect(world.logs).toEqual(['sync schedule: RangeError']);
    expect(world.run).toHaveBeenCalledTimes(1);
  });

  it('stop ends the looks', async () => {
    const world = setup();
    const schedule = await world.start();
    await schedule.initialRun;
    schedule.stop();

    await vi.advanceTimersByTimeAsync(5 * 60_000);

    expect(world.run).toHaveBeenCalledTimes(1);
  });
});
