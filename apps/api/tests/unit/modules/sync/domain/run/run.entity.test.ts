import { describe, expect, it } from 'vitest';

import { Run } from '#/modules/sync/domain/run/run.entity.ts';

const START = '2026-11-09T15:00:00.000Z';
const END = '2026-11-09T15:00:07.000Z';

describe('Run', () => {
  it('is born running, with the counts at zero', () => {
    const run = Run.start({ connectionId: 'c1', trigger: 'schedule' }, START);

    expect(run).toMatchObject({
      status: 'running',
      trigger: 'schedule',
      startedAt: START,
      finishedAt: null,
      errorCode: null,
      createdCount: 0,
      updatedCount: 0,
      removedCount: 0,
    });
    expect(run.isRunning()).toBe(true);
  });

  it('ends in success with the counts', () => {
    const run = Run.start({ connectionId: 'c1', trigger: 'first_connection' }, START);

    run.succeed({ createdCount: 12, updatedCount: 3, removedCount: 1 }, END);

    expect(run).toMatchObject({
      status: 'success',
      finishedAt: END,
      createdCount: 12,
      updatedCount: 3,
      removedCount: 1,
      errorCode: null,
    });
    expect(run.isRunning()).toBe(false);
  });

  it('ends in error with the code, and the counts stay at zero', () => {
    const run = Run.start({ connectionId: 'c1', trigger: 'retry' }, START);

    run.fail('LOGIN_ERROR', END);

    expect(run).toMatchObject({
      status: 'error',
      errorCode: 'LOGIN_ERROR',
      finishedAt: END,
      createdCount: 0,
    });
  });

  it('ends once: a run that ended does not end again', () => {
    const run = Run.start({ connectionId: 'c1', trigger: 'retry' }, START);
    run.fail('PROVIDER_ERROR', END);

    expect(() => run.succeed({ createdCount: 1, updatedCount: 0, removedCount: 0 }, END)).toThrow(
      RangeError,
    );
    expect(() => run.fail('LOGIN_ERROR', END)).toThrow(RangeError);
  });
});
