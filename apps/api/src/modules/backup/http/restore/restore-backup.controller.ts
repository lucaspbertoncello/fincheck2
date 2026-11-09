import type { RestoreBackupUseCase } from '#/modules/backup/application/restore/restore-backup.usecase.ts';

export class RestoreBackupController {
  private readonly restoreBackup: RestoreBackupUseCase;

  constructor(restoreBackup: RestoreBackupUseCase) {
    this.restoreBackup = restoreBackup;
  }

  async handle(
    request: RestoreBackupController.Request,
  ): Promise<RestoreBackupController.Response> {
    return this.restoreBackup.execute(request.body);
  }
}

export namespace RestoreBackupController {
  export type Request = { body: RestoreBackupUseCase.Input };
  export type Response = RestoreBackupUseCase.Output;
}
