import type { RunDailyBackupUseCase } from '#/modules/backup/application/run/run-daily-backup.usecase.ts';
import { computeDailyBackupTime } from '#/modules/backup/domain/run/compute-daily-backup-time.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// How often the time is looked at. The backup is due at 03:00 in São Paulo; a minute is fine for
// something that runs once a day.
const CHECK_EVERY_MS = 60_000;

// While there is no file of today the task is tried again every hour (a disk or a network folder
// that was off at 03:00 and is on at 09:00 gets its backup then).
const RETRY_EVERY_MS = 3_600_000;

// The daily backup (BR-BKP-001), with the `RunDailyBackupUseCase` that the backup module hands back:
//   - when the API starts, if the folder has no file with today's date (the PC was off at 03:00);
//     this does not wait for 03:00 and does not hold the start of the API: `startup` is the promise
//     of that first run, for a test or the shutdown to wait for;
//   - then, from 03:00 in São Paulo on, at most once an hour: the use case itself does nothing if
//     today already has its file (and without a folder it does nothing at all), so a day with its
//     file costs one look at the folder per hour, and a failure (folder off) is tried again in an
//     hour, not every minute; the failure stays in `lastError`.
// A look while `isPaused` is true (the restore is swapping the database) is skipped and tried again
// on the next one. Returns `stop`, which the shutdown calls.
export function startBackupSchedule(deps: {
  runDailyBackup: Pick<RunDailyBackupUseCase, 'execute'>;
  clock?: Clock;
  checkEveryMs?: number;
  log?: (message: string) => void;
  isPaused?: () => boolean;
}): { stop: () => void; startup: Promise<void> } {
  const clock = deps.clock ?? new SystemClock();
  const log = deps.log ?? ((message: string) => console.error(message));

  let lastAttemptAt = Number.NEGATIVE_INFINITY;
  const passedThreeToday = () => {
    const today = clock.today();

    return Date.parse(clock.now()) >= Date.parse(computeDailyBackupTime(today));
  };
  const attempt = async () => {
    try {
      await deps.runDailyBackup.execute();
    } catch (error) {
      log(`backup schedule: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startup = (async () => {
    if (deps.isPaused?.()) return;
    lastAttemptAt = Date.parse(clock.now());
    await attempt();
  })();

  const timer = setInterval(() => {
    if (deps.isPaused?.()) return;
    const now = Date.parse(clock.now());
    if (!passedThreeToday() || now - lastAttemptAt < RETRY_EVERY_MS) return;
    lastAttemptAt = now;
    void attempt();
  }, deps.checkEveryMs ?? CHECK_EVERY_MS);
  // The timer alone does not keep the process alive.
  timer.unref();

  return { stop: () => clearInterval(timer), startup };
}
