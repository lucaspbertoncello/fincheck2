import type { UpdateBackupFolderUseCase } from '#/modules/backup/application/folder/update-backup-folder.usecase.ts';

export class UpdateBackupFolderController {
  private readonly updateBackupFolder: UpdateBackupFolderUseCase;

  constructor(updateBackupFolder: UpdateBackupFolderUseCase) {
    this.updateBackupFolder = updateBackupFolder;
  }

  async handle(
    request: UpdateBackupFolderController.Request,
  ): Promise<UpdateBackupFolderController.Response> {
    return this.updateBackupFolder.execute(request.body);
  }
}

export namespace UpdateBackupFolderController {
  export type Request = { body: UpdateBackupFolderUseCase.Input };
  export type Response = UpdateBackupFolderUseCase.Output;
}
