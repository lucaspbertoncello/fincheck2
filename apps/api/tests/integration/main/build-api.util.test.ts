import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApi } from '#/main/build-api.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
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

// What `main.ts` runs. If the tasks are not tied to the modules here, these fail: the schedule has
// its own tests with a double, and `createApp` never starts it.
describe('buildApi', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await world.database.destroy();
  });

  const monthsOf = async (recurrenceId: string) =>
    (
      await world.database.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .where('recurrence_id', '=', recurrenceId)
        .orderBy('month')
        .execute()
    ).map((row) => row.month);

  it('makes the missing occurrences ready before it answers (the API was off when the month turned)', async () => {
    const { recurrence } = await world.create({ startsMonth: '2026-10' });
    await world.database.db.deleteFrom('recurrence_occurrences').execute();

    const api = await buildApi({
      db: world.database.db,
      localToken: 'token',
      clock: createFixedClock('2026-10-22T15:00:00.000Z'),
    });
    api.stop();

    expect(await monthsOf(recurrence.id)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
  });

  it('answers the routes of the app with the token it was given', async () => {
    const api = await buildApi({
      db: world.database.db,
      localToken: 'token',
      clock: createFixedClock('2026-10-22T15:00:00.000Z'),
    });
    api.stop();

    const ok = await api.app.request('/recurrences?month=2026-10', {
      headers: { [LOCAL_TOKEN_HEADER]: 'token' },
    });
    const refused = await api.app.request('/recurrences?month=2026-10');

    expect(ok.status).toBe(200);
    expect(refused.status).toBe(401);
  });

  it('keeps the occurrences ready every day: the first look of a new day in São Paulo adds the new month', async () => {
    vi.useFakeTimers();
    const { recurrence } = await world.create({ startsMonth: '2026-10' });
    const moving = movableClock('2026-10-31T23:00:00.000Z');
    const api = await buildApi({
      db: world.database.db,
      localToken: 'token',
      clock: moving.clock,
    });

    // 02:59Z of the 1st is still 23:59 of the 31st in São Paulo: nothing new.
    moving.moveTo('2026-11-01T02:59:00.000Z');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await monthsOf(recurrence.id)).toHaveLength(4);

    // 03:00Z is midnight in São Paulo: November is the current month and February enters.
    moving.moveTo('2026-11-01T03:00:00.000Z');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await monthsOf(recurrence.id)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);

    api.stop();
  });

  it('stops: no more runs after `stop`', async () => {
    vi.useFakeTimers();
    const { recurrence } = await world.create({ startsMonth: '2026-10' });
    const moving = movableClock('2026-10-22T15:00:00.000Z');
    const api = await buildApi({ db: world.database.db, localToken: 'token', clock: moving.clock });
    api.stop();

    moving.moveTo('2026-11-01T03:00:00.000Z');
    await vi.advanceTimersByTimeAsync(300_000);

    expect(await monthsOf(recurrence.id)).toHaveLength(4);
  });
});
