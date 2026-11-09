import { describe, expect, it } from 'vitest';

import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';

describe('BackupFileName', () => {
  it('writes the name in São Paulo time', () => {
    // 15:04:05Z is 12:04:05 in São Paulo (UTC-3).
    expect(BackupFileName.fromInstant('2026-11-08T15:04:05.678Z').value).toBe(
      'fincheck-2026-11-08-120405.db',
    );
  });

  it('is already the next day in the name when it is night in UTC but evening in São Paulo is over', () => {
    // 02:30Z of the 9th is 23:30 of the 8th in São Paulo.
    const name = BackupFileName.fromInstant('2026-11-09T02:30:00.000Z');

    expect(name.value).toBe('fincheck-2026-11-08-233000.db');
    expect(name.day).toBe('2026-11-08');
  });

  it('reads the instant back from the name, in UTC', () => {
    expect(BackupFileName.parse('fincheck-2026-11-07-030012.db')?.createdAt).toBe(
      '2026-11-07T06:00:12.000Z',
    );
  });

  it('round trips a name through its instant', () => {
    const name = BackupFileName.parse('fincheck-2026-02-28-235959.db');

    expect(name && BackupFileName.fromInstant(name.createdAt).value).toBe(
      'fincheck-2026-02-28-235959.db',
    );
  });

  it('gives the day of the name', () => {
    expect(BackupFileName.parse('fincheck-2026-11-07-030012.db')?.day).toBe('2026-11-07');
  });

  it.each([
    'fincheck-2026-11-07.db',
    'fincheck-2026-11-07-030012.db.tmp',
    'fincheck-2026-13-07-030012.db',
    'fincheck-2026-02-30-030012.db',
    'fincheck-2026-11-07-250012.db',
    'fincheck-2026-11-07-030012.sqlite',
    '..\\fincheck-2026-11-07-030012.db',
    'other-2026-11-07-030012.db',
  ])('does not read %s as a backup name', (name) => {
    expect(BackupFileName.parse(name)).toBeNull();
  });

  it('moves forward second by second while the name is taken', () => {
    const taken = new Set([
      'fincheck-2026-11-08-120000.db',
      'fincheck-2026-11-08-120001.db',
      'fincheck-2026-11-08-120002.db',
    ]);

    expect(BackupFileName.firstFree('2026-11-08T15:00:00.000Z', taken).value).toBe(
      'fincheck-2026-11-08-120003.db',
    );
  });

  it('keeps the name when it is free', () => {
    expect(BackupFileName.firstFree('2026-11-08T15:00:00.000Z', new Set()).value).toBe(
      'fincheck-2026-11-08-120000.db',
    );
  });

  it('rolls over the minute, the hour and the day when moving forward', () => {
    const taken = new Set(['fincheck-2026-11-08-235959.db']);

    expect(BackupFileName.firstFree('2026-11-09T02:59:59.000Z', taken).value).toBe(
      'fincheck-2026-11-09-000000.db',
    );
  });
});
