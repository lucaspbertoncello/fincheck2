import { describe, expect, it } from 'vitest';

import { backupFileNameSchema } from '#/backup/backup-file/backup-file.schema.ts';

describe('backupFileNameSchema', () => {
  it('accepts the dated name', () => {
    expect(backupFileNameSchema.safeParse('fincheck-2026-10-22-030000.db').success).toBe(true);
  });

  it('refuses another format and anything that points outside the folder', () => {
    expect(backupFileNameSchema.safeParse('fincheck-2026-10-22.db').success).toBe(false);
    expect(backupFileNameSchema.safeParse('../fincheck-2026-10-22-030000.db').success).toBe(false);
    expect(backupFileNameSchema.safeParse('sub/fincheck-2026-10-22-030000.db').success).toBe(false);
    expect(backupFileNameSchema.safeParse('fincheck-2026-10-22-030000.db.exe').success).toBe(false);
  });
});
