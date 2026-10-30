import { describe, expect, it } from 'vitest';

import { updateBackupSettingsRequestSchema } from '#/backup/backup-settings/backup-settings.schema.ts';

describe('updateBackupSettingsRequestSchema', () => {
  it('accepts a drive path and a network path', () => {
    expect(updateBackupSettingsRequestSchema.safeParse({ folderPath: 'D:\\Backups' }).success).toBe(
      true,
    );
    expect(
      updateBackupSettingsRequestSchema.safeParse({ folderPath: '\\\\nas\\fincheck' }).success,
    ).toBe(true);
  });

  it('refuses a relative path and a path above 260 characters', () => {
    expect(updateBackupSettingsRequestSchema.safeParse({ folderPath: 'backups' }).success).toBe(
      false,
    );
    expect(updateBackupSettingsRequestSchema.safeParse({ folderPath: '..\\backups' }).success).toBe(
      false,
    );
    expect(
      updateBackupSettingsRequestSchema.safeParse({ folderPath: `C:\\${'a'.repeat(260)}` }).success,
    ).toBe(false);
  });
});
