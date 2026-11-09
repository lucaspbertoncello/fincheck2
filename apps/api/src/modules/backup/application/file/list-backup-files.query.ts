import type { BackupFile } from '@fincheck/shared/backup/backup-file/backup-file.type.ts';

import type { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import type { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';

// `GET /backup/files`: the backups of the folder, newest first, for the dialog "Restaurar um
// backup". No folder chosen: an empty list. A folder that no longer opens is
// `BACKUP_FOLDER_INVALID`.
export class ListBackupFilesQuery {
  private readonly settings: GetBackupSettingsQuery;
  private readonly catalog: BackupCatalog;

  constructor(settings: GetBackupSettingsQuery, catalog: BackupCatalog) {
    this.settings = settings;
    this.catalog = catalog;
  }

  async execute(): Promise<ListBackupFilesQuery.Output> {
    const settings = await this.settings.execute();
    if (!settings) return { items: [] };

    const entries = await this.catalog.list(settings.folderPath);

    return {
      items: entries.map((entry) => ({
        fileName: entry.fileName,
        createdAt: entry.createdAt,
        sizeBytes: entry.sizeBytes,
      })),
    };
  }
}

export namespace ListBackupFilesQuery {
  export type Output = { items: BackupFile.Dto[] };
}
