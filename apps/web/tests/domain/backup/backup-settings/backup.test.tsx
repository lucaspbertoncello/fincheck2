import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBackupFiles } from '#/domain/backup/backup-file/hooks/use-backup-files.hook.ts';
import { useUpdateBackupSettings } from '#/domain/backup/backup-settings/hooks/use-update-backup-settings.hook.ts';
import { useBackupStatus } from '#/domain/backup/backup-status/hooks/use-backup-status.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('backup domain', () => {
  it('reads the status and the files', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => ({ status: useBackupStatus(), files: useBackupFiles() }), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.status.isSuccess).toBe(true);
      expect(result.current.files.isSuccess).toBe(true);
    });

    expect(result.current.files.data?.items.length).toBeGreaterThan(0);
  });

  it('changes the folder and the status read follows', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ status: useBackupStatus(), update: useUpdateBackupSettings() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.status.isSuccess).toBe(true));

    await act(async () => {
      await result.current.update.mutateAsync({ folderPath: 'E:\\Copias' });
    });

    await waitFor(() => expect(result.current.status.data?.folderPath).toBe('E:\\Copias'));
  });
});
