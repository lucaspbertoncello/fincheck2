import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createAppParts } from '#/main/http/create-app-parts.util.ts';
import { startBackupSchedule } from '#/main/schedules/backup.schedule.ts';
import { startRecurrencesSchedule } from '#/main/schedules/recurrences.schedule.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// What `main.ts` runs: the HTTP app and the tasks of the API, built from the same modules. The
// occurrences are made ready before this answers (so before the first request) and again every day,
// with the use case the recurrences module itself hands back. The daily backup starts too (it does
// not hold the answer; `backupStartup` is the promise of its first run). The tasks hold back while
// the restore of a backup swaps the database file. `stop` ends the tasks.
export async function buildApi(deps: {
  db: ReplaceableDatabase;
  localToken: string;
  clock?: Clock;
  log?: (message: string) => void;
}) {
  const clock = deps.clock ?? new SystemClock();
  const { app, gate, ensureOccurrences, runDailyBackup } = createAppParts({
    db: deps.db,
    localToken: deps.localToken,
    clock,
  });
  const log = deps.log ? { log: deps.log } : {};
  const isPaused = () => gate.isActive();
  const recurrences = await startRecurrencesSchedule({
    ensureOccurrences,
    clock,
    isPaused,
    ...log,
  });
  const backup = startBackupSchedule({ runDailyBackup, clock, isPaused, ...log });

  return {
    app,
    backupStartup: backup.startup,
    stop: () => {
      recurrences.stop();
      backup.stop();
    },
  };
}
