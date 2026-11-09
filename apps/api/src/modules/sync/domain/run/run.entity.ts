import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Run as RunContract } from '@fincheck/shared/sync/run/run.type.ts';

import { generateId } from '#/shared/id/generate-id.util.ts';

// One search in the Pluggy (BR-SYN-003): who asked for it, when it started and finished, how it
// ended and what it changed. It shows the hours of the attempts in the error banner and answers "o
// que mudou". It is born `running`, with the counts at zero, and ends once: `success` with the
// counts, or `error` with the code already translated (never the message of the Pluggy).
export class Run {
  readonly id: string;
  readonly connectionId: string;
  readonly trigger: RunContract.Trigger;
  readonly startedAt: string;
  status: RunContract.Status;
  finishedAt: string | null;
  errorCode: Connection.ErrorCode | null;
  createdCount: number;
  updatedCount: number;
  removedCount: number;

  constructor(attr: Run.Attributes) {
    this.id = attr.id ?? generateId();
    this.connectionId = attr.connectionId;
    this.trigger = attr.trigger;
    this.startedAt = attr.startedAt;
    this.status = attr.status;
    this.finishedAt = attr.finishedAt;
    this.errorCode = attr.errorCode;
    this.createdCount = attr.createdCount;
    this.updatedCount = attr.updatedCount;
    this.removedCount = attr.removedCount;
  }

  static start(input: { connectionId: string; trigger: RunContract.Trigger }, now: string): Run {
    return new Run({
      connectionId: input.connectionId,
      trigger: input.trigger,
      startedAt: now,
      status: 'running',
      finishedAt: null,
      errorCode: null,
      createdCount: 0,
      updatedCount: 0,
      removedCount: 0,
    });
  }

  isRunning(): boolean {
    return this.status === 'running';
  }

  succeed(counts: Run.Counts, now: string): void {
    this.assertRunning();
    this.status = 'success';
    this.finishedAt = now;
    this.createdCount = counts.createdCount;
    this.updatedCount = counts.updatedCount;
    this.removedCount = counts.removedCount;
  }

  fail(code: Connection.ErrorCode, now: string): void {
    this.assertRunning();
    this.status = 'error';
    this.finishedAt = now;
    this.errorCode = code;
  }

  private assertRunning(): void {
    if (this.status !== 'running') throw new RangeError('The run already ended');
  }
}

export namespace Run {
  export type Counts = { createdCount: number; updatedCount: number; removedCount: number };

  export type Attributes = Counts & {
    id?: string;
    connectionId: string;
    trigger: RunContract.Trigger;
    startedAt: string;
    status: RunContract.Status;
    finishedAt: string | null;
    errorCode: Connection.ErrorCode | null;
  };
}
