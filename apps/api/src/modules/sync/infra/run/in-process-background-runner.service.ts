import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';

// Runs the task of a round in this same process, without making the request wait for it. The
// round records its own failure in its run; what comes out of it anyway (a bug) has nobody to
// answer, so it goes to the log, by its name only: the message of an error may carry data.
export class InProcessBackgroundRunner implements BackgroundRunner {
  private readonly log: (message: string) => void;

  constructor(log: (message: string) => void = (message) => console.error(message)) {
    this.log = log;
  }

  start(task: () => Promise<void>): void {
    void task().catch((error: unknown) => {
      this.log(`sync round: ${error instanceof Error ? error.name : 'unknown failure'}`);
    });
  }
}
