import type { ListBackupFilesQuery } from '#/modules/backup/application/file/list-backup-files.query.ts';

export class ListBackupFilesController {
  private readonly listBackupFiles: ListBackupFilesQuery;

  constructor(listBackupFiles: ListBackupFilesQuery) {
    this.listBackupFiles = listBackupFiles;
  }

  async handle(): Promise<ListBackupFilesController.Response> {
    return this.listBackupFiles.execute();
  }
}

export namespace ListBackupFilesController {
  export type Response = ListBackupFilesQuery.Output;
}
