import { describe, expect, it } from 'vitest';

import type { BackupFileFacts } from '#/modules/backup/domain/file/backup-file-facts.type.ts';
import { assessBackupFile } from '#/modules/backup/domain/file/assess-backup-file.util.ts';

const KNOWN = ['001-first', '002-second', '003-third'];

const facts = (overrides: Partial<BackupFileFacts> = {}): BackupFileFacts => ({
  readable: true,
  integrityOk: true,
  tableNames: [
    'kysely_migration',
    'categories',
    'tags',
    'accounts',
    'credit_cards',
    'transactions',
  ],
  migrationNames: ['001-first', '002-second', '003-third'],
  ...overrides,
});

describe('assessBackupFile', () => {
  it('accepts a file of the same version', () => {
    expect(assessBackupFile(facts(), KNOWN)).toBeNull();
  });

  it('accepts a file of an older version (it is migrated when restored)', () => {
    expect(assessBackupFile(facts({ migrationNames: ['001-first'] }), KNOWN)).toBeNull();
  });

  it('calls a file SQLite cannot read corrupt', () => {
    expect(assessBackupFile(facts({ readable: false }), KNOWN)).toBe('corrupt');
  });

  it('calls a file that fails the integrity check corrupt', () => {
    expect(assessBackupFile(facts({ integrityOk: false }), KNOWN)).toBe('corrupt');
  });

  it('says corrupt before anything else', () => {
    expect(
      assessBackupFile(
        facts({ integrityOk: false, tableNames: [], migrationNames: ['999-x'] }),
        KNOWN,
      ),
    ).toBe('corrupt');
  });

  it('refuses a database without the tables of Fincheck', () => {
    expect(assessBackupFile(facts({ tableNames: ['notes'] }), KNOWN)).toBe('not_fincheck');
  });

  it('refuses a database that lacks one of the core tables, or the table of the migrations', () => {
    expect(
      assessBackupFile(facts({ tableNames: ['kysely_migration', 'categories', 'tags'] }), KNOWN),
    ).toBe('not_fincheck');
    expect(
      assessBackupFile(
        facts({ tableNames: ['categories', 'tags', 'accounts', 'credit_cards'] }),
        KNOWN,
      ),
    ).toBe('not_fincheck');
  });

  it('refuses a file that records a migration this app does not know (newer version)', () => {
    expect(
      assessBackupFile(facts({ migrationNames: [...KNOWN, '004-from-the-future'] }), KNOWN),
    ).toBe('newer_version');
  });

  it('says not_fincheck before newer_version', () => {
    expect(assessBackupFile(facts({ tableNames: [], migrationNames: ['999-x'] }), KNOWN)).toBe(
      'not_fincheck',
    );
  });
});
