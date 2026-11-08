import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// How often the day is looked at. The task runs on the first look of a new day in São Paulo, so
// right after midnight (00:00); a minute is fine for something that runs once a day.
const CHECK_EVERY_MS = 60_000;

// Creates the occurrences that are missing, with the `EnsureOccurrencesUseCase` that the
// recurrences module hands back (the same one the controllers call): once when it starts, before
// the API serves a request (it may have been off when the month turned), and again on the first
// look of each new day in São Paulo, which catches the turn of the month. The reads that depend on
// the occurrences do it too, so this only keeps the data ready. A failure is tried again on every
// look (each minute) until it works, and logged once a day, so a lasting error does not flood the
// log. Returns `stop`, which the shutdown calls.
export async function startRecurrencesSchedule(deps: {
  ensureOccurrences: Pick<EnsureOccurrencesUseCase, 'execute'>;
  clock?: Clock;
  checkEveryMs?: number;
  log?: (message: string) => void;
}): Promise<{ stop: () => void }> {
  const clock = deps.clock ?? new SystemClock();
  const log = deps.log ?? ((message: string) => console.error(message));

  let doneOn = '';
  let loggedOn = '';
  const run = async () => {
    const today = clock.today().value;
    if (today === doneOn) return;
    try {
      await deps.ensureOccurrences.execute();
      doneOn = today;
    } catch (error) {
      if (loggedOn !== today) {
        loggedOn = today;
        log(`recurrences schedule: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  await run();
  const timer = setInterval(() => void run(), deps.checkEveryMs ?? CHECK_EVERY_MS);
  // The timer alone does not keep the process alive.
  timer.unref();

  return { stop: () => clearInterval(timer) };
}
