import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useFreeBalance } from '#/domain/dashboard/free-balance/hooks/use-free-balance.hook.ts';
import { useCreateTransaction } from '#/domain/transactions/transaction/hooks/use-create-transaction.hook.ts';
import { useIgnoreTransaction } from '#/domain/transactions/transaction/hooks/use-ignore-transaction.hook.ts';
import { useInfiniteTransactions } from '#/domain/transactions/transaction/hooks/use-infinite-transactions.hook.ts';
import { useTransactions } from '#/domain/transactions/transaction/hooks/use-transactions.hook.ts';
import { useUnignoreTransaction } from '#/domain/transactions/transaction/hooks/use-unignore-transaction.hook.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('transactions domain', () => {
  it('reads a month of transactions', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTransactions({ month: CURRENT_MONTH }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items.length).toBeGreaterThan(5);
  });

  it('reads without a month page by page, by cursor', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useInfiniteTransactions({ limit: 5 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(5);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    const [first, second] = result.current.data?.pages ?? [];
    expect(second?.items).toHaveLength(5);
    expect(second?.items[0]?.id).not.toBe(first?.items[0]?.id);
  });

  it('a new transaction refreshes the month list and the Livre (another context)', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useTransactions({ month: CURRENT_MONTH }),
        free: useFreeBalance(),
        accounts: useAccounts(),
        create: useCreateTransaction(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
      expect(result.current.free.isSuccess).toBe(true);
      expect(result.current.accounts.isSuccess).toBe(true);
    });
    const before = result.current.free.data?.accounts.totalCents ?? 0;
    const accountId =
      result.current.accounts.data?.items.find((item) => item.name === 'Carteira')?.id ?? '';

    let createdId = '';
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        type: 'expense',
        accountId,
        method: 'cash',
        description: 'Padaria nova',
        amountCents: 1500,
        occurredOn: TODAY,
      });
      createdId = created.id;
    });

    await waitFor(() =>
      expect(result.current.list.data?.items.some((item) => item.id === createdId)).toBe(true),
    );
    await waitFor(() => expect(result.current.free.data?.accounts.totalCents).toBe(before - 1500));
  });

  it('ignores and brings back a transaction (the toast undo)', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useTransactions({ month: CURRENT_MONTH }),
        ignore: useIgnoreTransaction(),
        unignore: useUnignoreTransaction(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    const target = result.current.list.data?.items.find((item) => item.ignoredAt === null);
    const read = () => result.current.list.data?.items.find((item) => item.id === target?.id);

    await act(async () => {
      await result.current.ignore.mutateAsync(target?.id ?? '');
    });
    await waitFor(() => expect(read()?.ignoredAt).not.toBeNull());

    await act(async () => {
      await result.current.unignore.mutateAsync(target?.id ?? '');
    });
    await waitFor(() => expect(read()?.ignoredAt).toBeNull());
  });
});
