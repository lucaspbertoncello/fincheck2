import { describe, expect, it } from 'vitest';

import { restoreBackupRequestSchema } from '#/backup/backup-restore/backup-restore.schema.ts';

describe('restoreBackupRequestSchema', () => {
  it('takes the name of a file in the list', () => {
    expect(
      restoreBackupRequestSchema.safeParse({ fileName: 'fincheck-2026-10-21-030000.db' }).success,
    ).toBe(true);
  });

  it('refuses another name format', () => {
    expect(restoreBackupRequestSchema.safeParse({ fileName: 'qualquer.db' }).success).toBe(false);
  });
});
