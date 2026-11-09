import { readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BACKUP_FILE_NAME_PATTERN } from '@fincheck/shared/backup/backup-file/backup-file.constant.ts';

import type { BackupFolder } from '#/modules/backup/application/folder/backup-folder.interface.ts';
import { BackupFolderInvalidError } from '#/modules/backup/domain/folder/backup-folder-invalid.error.ts';
import { renameWithRetry } from '#/modules/backup/infra/restore/rename-with-retry.util.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

// The folder of backups on the disk, over `node:fs`.
export class FileSystemBackupFolder implements BackupFolder {
  async listBackups(folder: string): Promise<BackupFolder.Entry[]> {
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch (error) {
      throw new BackupFolderInvalidError(
        FileSystemBackupFolder.errorCode(error) === 'ENOTDIR' ? 'not_a_folder' : 'not_found',
      );
    }

    const backups: BackupFolder.Entry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !BACKUP_FILE_NAME_PATTERN.test(entry.name)) continue;
      try {
        backups.push({
          fileName: entry.name,
          sizeBytes: (await stat(join(folder, entry.name))).size,
        });
      } catch {
        // Gone between the listing and the stat: it is not in the folder any more.
      }
    }

    return backups;
  }

  async assertUsable(folder: string): Promise<void> {
    let info;
    try {
      info = await stat(folder);
    } catch (error) {
      throw new BackupFolderInvalidError(
        FileSystemBackupFolder.errorCode(error) === 'ENOTDIR' ? 'not_a_folder' : 'not_found',
      );
    }
    if (!info.isDirectory()) throw new BackupFolderInvalidError('not_a_folder');

    const probe = join(folder, `.fincheck-write-test-${generateId()}`);
    try {
      await writeFile(probe, '');
    } catch {
      throw new BackupFolderInvalidError('not_writable');
    }
    await rm(probe, { force: true });
  }

  async rename(folder: string, from: string, to: string): Promise<void> {
    await renameWithRetry(join(folder, from), join(folder, to));
  }

  async remove(folder: string, fileName: string): Promise<void> {
    await rm(join(folder, fileName), { force: true });
  }

  private static errorCode(error: unknown): string {
    return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  }
}
