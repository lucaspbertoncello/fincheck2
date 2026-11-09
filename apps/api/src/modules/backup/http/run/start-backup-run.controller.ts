import type { StartBackupRunUseCase } from '#/modules/backup/application/run/start-backup-run.usecase.ts';

export class StartBackupRunController {
  private readonly startBackupRun: StartBackupRunUseCase;

  constructor(startBackupRun: StartBackupRunUseCase) {
    this.startBackupRun = startBackupRun;
  }

  async handle(): Promise<StartBackupRunController.Response> {
    return this.startBackupRun.execute();
  }
}

export namespace StartBackupRunController {
  export type Response = StartBackupRunUseCase.Output;
}
