import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { createAppParts } from '#/main/http/create-app-parts.util.ts';
import { startRecurrencesSchedule } from '#/main/schedules/recurrences.schedule.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// What `main.ts` runs: the HTTP app and the tasks of the API, built from the same modules. The
// occurrences are made ready before this answers (so before the first request) and again every day,
// with the use case the recurrences module itself hands back. `stop` ends the tasks.
export async function buildApi(deps: {
  db: Kysely<Database>;
  localToken: string;
  clock?: Clock;
  log?: (message: string) => void;
}) {
  const clock = deps.clock ?? new SystemClock();
  const { app, ensureOccurrences } = createAppParts({
    db: deps.db,
    localToken: deps.localToken,
    clock,
  });
  const recurrences = await startRecurrencesSchedule({
    ensureOccurrences,
    clock,
    ...(deps.log ? { log: deps.log } : {}),
  });

  return { app, stop: recurrences.stop };
}
