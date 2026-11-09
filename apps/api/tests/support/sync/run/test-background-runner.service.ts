import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';

// The runner of the background rounds as a double: it starts the task at once, keeps its promise and
// lets the test wait for all of them (`settled`), so "202, and the round goes on" can be checked
// after it finished. `started` counts the rounds it was asked to run. With `hold` on it only keeps the
// task: it begins when `settled` is called, so a test can change the world between the 202 and the round.
export class TestBackgroundRunner implements BackgroundRunner {
  started = 0;
  hold = false;
  private readonly held: (() => Promise<void>)[] = [];
  private readonly running: Promise<void>[] = [];

  start(task: () => Promise<void>): void {
    this.started += 1;
    if (this.hold) this.held.push(task);
    else this.running.push(task().catch(() => undefined));
  }

  async settled(): Promise<void> {
    for (const task of this.held.splice(0)) this.running.push(task().catch(() => undefined));
    while (this.running.length > 0) await this.running.shift();
  }
}
