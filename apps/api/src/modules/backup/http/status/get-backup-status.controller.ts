import type { GetBackupStatusQuery } from '#/modules/backup/application/status/get-backup-status.query.ts';

export class GetBackupStatusController {
  private readonly getBackupStatus: GetBackupStatusQuery;

  constructor(getBackupStatus: GetBackupStatusQuery) {
    this.getBackupStatus = getBackupStatus;
  }

  async handle(): Promise<GetBackupStatusController.Response> {
    return this.getBackupStatus.execute();
  }
}

export namespace GetBackupStatusController {
  export type Response = GetBackupStatusQuery.Output;
}
