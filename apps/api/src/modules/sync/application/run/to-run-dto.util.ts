import type { Run as RunContract } from '@fincheck/shared/sync/run/run.type.ts';

import type { Run } from '#/modules/sync/domain/run/run.entity.ts';

export function toRunDto(run: Run): RunContract.Dto {
  return {
    id: run.id,
    trigger: run.trigger,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    errorCode: run.errorCode,
    createdCount: run.createdCount,
    updatedCount: run.updatedCount,
    removedCount: run.removedCount,
  };
}
