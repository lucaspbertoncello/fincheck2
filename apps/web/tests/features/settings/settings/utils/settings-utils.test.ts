import { describe, expect, it } from 'vitest';

import { hasSharedMinute } from '#/features/settings/settings/backup/utils/has-shared-minute.util.ts';
import { formatBackupMoment } from '#/features/settings/settings/backup/utils/format-backup-moment.util.ts';
import { formatFileSize } from '#/features/settings/settings/backup/utils/format-file-size.util.ts';
import { formatTimeAgo } from '#/features/settings/settings/connections/utils/format-time-ago.util.ts';
import { getActionErrorMessage } from '#/features/settings/settings/utils/get-action-error-message.util.ts';
import { findSectionByHash } from '#/features/settings/settings/utils/find-section-by-hash.util.ts';
import { findSectionByPathname } from '#/features/settings/settings/utils/find-section-by-pathname.util.ts';
import { joinNames } from '#/features/settings/settings/utils/join-names.util.ts';
import { ApiError } from '#/shared/api/api.error.ts';

// 22/10/2026, 15:00 in São Paulo (UTC-3).
const NOW = new Date('2026-10-22T18:00:00.000Z');

describe('formatTimeAgo', () => {
  it('says how long ago an instant was', () => {
    expect(formatTimeAgo('2026-10-22T17:59:40.000Z', NOW)).toBe('agora há pouco');
    expect(formatTimeAgo('2026-10-22T17:48:00.000Z', NOW)).toBe('há 12 min');
    expect(formatTimeAgo('2026-10-22T15:00:00.000Z', NOW)).toBe('há 3 h');
    expect(formatTimeAgo('2026-10-21T10:00:00.000Z', NOW)).toBe('há 1 dia');
    expect(formatTimeAgo('2026-10-19T10:00:00.000Z', NOW)).toBe('há 3 dias');
  });

  it('never goes negative when the instant is ahead of the clock', () => {
    expect(formatTimeAgo('2026-10-22T18:30:00.000Z', NOW)).toBe('agora há pouco');
  });
});

describe('hasSharedMinute', () => {
  const files = [
    { fileName: 'a.db', createdAt: '2026-11-09T10:04:44.000Z' },
    { fileName: 'b.db', createdAt: '2026-11-09T10:04:36.000Z' },
    { fileName: 'c.db', createdAt: '2026-11-09T09:00:00.000Z' },
  ];

  it('is true only for the backups that share a minute with another one', () => {
    expect(hasSharedMinute(files[0]!, files)).toBe(true);
    expect(hasSharedMinute(files[1]!, files)).toBe(true);
    expect(hasSharedMinute(files[2]!, files)).toBe(false);
  });

  it('shows the seconds of a moment on request', () => {
    expect(formatBackupMoment('2026-10-22T06:00:07.000Z', NOW, true)).toBe('hoje às 03:00:07');
  });
});

describe('formatBackupMoment', () => {
  it('uses hoje, ontem, amanhã and the day, always in São Paulo time', () => {
    expect(formatBackupMoment('2026-10-22T06:00:00.000Z', NOW)).toBe('hoje às 03:00');
    expect(formatBackupMoment('2026-10-21T06:00:00.000Z', NOW)).toBe('ontem às 03:00');
    expect(formatBackupMoment('2026-10-23T06:00:00.000Z', NOW)).toBe('amanhã às 03:00');
    expect(formatBackupMoment('2026-10-18T06:00:00.000Z', NOW)).toBe('18/10 às 03:00');
  });

  it('reads the São Paulo date, not the UTC one', () => {
    // 01:00 UTC on the 23rd is still 22:00 of the 22nd in São Paulo.
    expect(formatBackupMoment('2026-10-23T01:00:00.000Z', NOW)).toBe('hoje às 22:00');
  });
});

describe('formatFileSize', () => {
  it('shows MB with one decimal, and KB below 1 MB', () => {
    expect(formatFileSize(14_900_000)).toBe('14,2 MB');
    expect(formatFileSize(512_000)).toBe('500,0 KB');
  });
});

describe('findSectionByHash', () => {
  it('reads the section of an old anchor and says nothing for the rest', () => {
    expect(findSectionByHash('#backup')?.path).toBe('/settings/data'); // the old anchor
    expect(findSectionByHash('#data')?.path).toBe('/settings/data');
    expect(findSectionByHash('#appearance')?.path).toBe('/settings/appearance');
    expect(findSectionByHash('#connections')?.path).toBe('/settings/connections');
    // Perfil left Configurações: its old anchor is redirected by the route, not found here.
    expect(findSectionByHash('#profile')).toBeUndefined();
    expect(findSectionByHash('')).toBeUndefined();
    expect(findSectionByHash('#nada')).toBeUndefined();
  });
});

describe('findSectionByPathname', () => {
  it('finds the section of a page, with or without the trailing slash, and none for the list', () => {
    expect(findSectionByPathname('/settings/data')?.key).toBe('data');
    expect(findSectionByPathname('/settings/data/')?.key).toBe('data');
    expect(findSectionByPathname('/settings')).toBeUndefined();
  });
});

describe('joinNames', () => {
  it('joins names the Portuguese way', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Nubank'])).toBe('Nubank');
    expect(joinNames(['Nubank', 'Bradesco'])).toBe('Nubank e Bradesco');
    expect(joinNames(['Nubank', 'Bradesco', 'Inter'])).toBe('Nubank, Bradesco e Inter');
  });
});

describe('getActionErrorMessage', () => {
  it('decides by code and reason, and falls back for the rest', () => {
    const folder = new ApiError(422, 'BACKUP_FOLDER_INVALID', 'x', { reason: 'not_found' });
    const busy = new ApiError(409, 'BACKUP_IN_PROGRESS', 'x');
    const other = new ApiError(500, 'UNKNOWN_ERROR', 'x');

    expect(getActionErrorMessage(folder, 'falhou')).toBe('Essa pasta não existe.');
    expect(getActionErrorMessage(busy, 'falhou')).toBe(
      'Há um backup ou uma restauração em andamento. Espere terminar e tente de novo.',
    );
    expect(getActionErrorMessage(other, 'falhou')).toBe('falhou');
    expect(getActionErrorMessage(new Error('boom'), 'falhou')).toBe('falhou');
  });
});
