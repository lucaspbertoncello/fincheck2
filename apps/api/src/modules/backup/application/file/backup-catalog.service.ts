import type { BackupFolder } from '#/modules/backup/application/folder/backup-folder.interface.ts';
import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';
import { BackupFolderInvalidError } from '#/modules/backup/domain/folder/backup-folder-invalid.error.ts';

// The backups that are in the folder, read from the folder itself (the source of truth: after a
// restore the database goes back in time and the folder does not). Newest first by the instant in
// the name.
export class BackupCatalog {
  private readonly folder: BackupFolder;

  constructor(folder: BackupFolder) {
    this.folder = folder;
  }

  // Throws `BackupFolderInvalidError` when the folder does not open.
  async list(folderPath: string): Promise<BackupCatalog.Entry[]> {
    const entries = await this.folder.listBackups(folderPath);

    return entries
      .flatMap((entry) => {
        const name = BackupFileName.parse(entry.fileName);

        return name
          ? [
              {
                fileName: name.value,
                createdAt: name.createdAt,
                day: name.day,
                sizeBytes: entry.sizeBytes,
              },
            ]
          : [];
      })
      .sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.fileName.localeCompare(a.fileName),
      );
  }

  // The same, but a folder that does not open is an empty one (for what only reads to show).
  async listOrEmpty(folderPath: string): Promise<BackupCatalog.Entry[]> {
    try {
      return await this.list(folderPath);
    } catch (error) {
      if (error instanceof BackupFolderInvalidError) return [];
      throw error;
    }
  }
}

export namespace BackupCatalog {
  export type Entry = { fileName: string; createdAt: string; day: string; sizeBytes: number };
}
