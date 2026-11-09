import { backupErrorCodeSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The single row of `backup_settings`: the chosen folder and the last failure. Null while no folder
// was ever chosen (the row is born with the first folder).
export class GetBackupSettingsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(): Promise<GetBackupSettingsQuery.Output | null> {
    const row = await this.db
      .selectFrom('backup_settings')
      .select(['folder_path', 'last_error_at', 'last_error_code'])
      .where('id', '=', 1)
      .executeTakeFirst();
    if (!row) return null;

    const code = backupErrorCodeSchema.safeParse(row.last_error_code);

    return {
      folderPath: row.folder_path,
      lastError:
        row.last_error_at === null
          ? null
          : { at: row.last_error_at, code: code.success ? code.data : 'BACKUP_FAILED' },
    };
  }
}

export namespace GetBackupSettingsQuery {
  export type Output = { folderPath: string; lastError: BackupStatus.LastError | null };
}
