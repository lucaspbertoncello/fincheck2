import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useArchiveAccount } from '#/domain/accounts/account/hooks/use-archive-account.hook.ts';
import { useCreateAccount } from '#/domain/accounts/account/hooks/use-create-account.hook.ts';
import { useUnarchiveAccount } from '#/domain/accounts/account/hooks/use-unarchive-account.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('accounts domain', () => {
  it('reads the accounts and one account', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useAccounts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [first] = result.current.data?.items ?? [];

    const detail = renderHook(() => useAccount(first?.id ?? ''), { wrapper });
    await waitFor(() => expect(detail.result.current.data?.id).toBe(first?.id));
  });

  it('creates an account and the list shows it; archive and the undo move it out and back', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useAccounts(),
        create: useCreateAccount(),
        archive: useArchiveAccount(),
        unarchive: useUnarchiveAccount(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    let createdId = '';
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        type: 'savings',
        name: 'Reserva',
        institutionCode: 'inter',
        initialBalanceCents: 50_000,
      });
      createdId = created.id;
    });
    const listed = () => result.current.list.data?.items.some((item) => item.id === createdId);
    await waitFor(() => expect(listed()).toBe(true));

    await act(async () => {
      await result.current.archive.mutateAsync(createdId);
    });
    await waitFor(() => expect(listed()).toBe(false));

    await act(async () => {
      await result.current.unarchive.mutateAsync(createdId);
    });
    await waitFor(() => expect(listed()).toBe(true));
  });
});
