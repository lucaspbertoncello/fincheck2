import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSpendHeatmapRange } from '#/domain/dashboard/spend-heatmap/hooks/use-spend-heatmap-range.hook.ts';
import { useSpendHeatmap } from '#/domain/dashboard/spend-heatmap/hooks/use-spend-heatmap.hook.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('spend heatmap domain', () => {
  it('reads the map up to today by default', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useSpendHeatmap(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.untilOn).toBe(TODAY);
    expect(result.current.data?.levels).toHaveLength(4);
  });

  it('reads the map up to a given day, with its own cache key', async () => {
    const { wrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ today: useSpendHeatmap(), past: useSpendHeatmap('2026-01-31') }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.today.isSuccess).toBe(true);
      expect(result.current.past.isSuccess).toBe(true);
    });

    expect(result.current.past.data?.untilOn).toBe('2026-01-31');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it('reads the map of a period asked as from and to, with its own cache key', async () => {
    const { wrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        month: useSpendHeatmapRange('2026-09-01', '2026-09-30'),
        year: useSpendHeatmapRange('2026-01-01', '2026-12-31'),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.month.isSuccess).toBe(true);
      expect(result.current.year.isSuccess).toBe(true);
    });

    expect(result.current.month.data?.fromOn).toBe('2026-09-01');
    expect(result.current.month.data?.days).toHaveLength(30);
    expect(result.current.year.data?.untilOn).toBe('2026-12-31');
    expect(result.current.year.data?.days).toHaveLength(365);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it('keeps the previous period on screen while the next one loads', async () => {
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(({ from, to }) => useSpendHeatmapRange(from, to), {
      wrapper,
      initialProps: { from: '2026-09-01', to: '2026-09-30' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ from: '2026-08-01', to: '2026-08-31' });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.fromOn).toBe('2026-09-01');
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.fromOn).toBe('2026-08-01');
  });

  it('reads the map of a period asked as from and to, with its own cache key', async () => {
    const { wrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        month: useSpendHeatmapRange('2026-09-01', '2026-09-30'),
        year: useSpendHeatmapRange('2026-01-01', '2026-12-31'),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.month.isSuccess).toBe(true);
      expect(result.current.year.isSuccess).toBe(true);
    });

    expect(result.current.month.data?.fromOn).toBe('2026-09-01');
    expect(result.current.month.data?.days).toHaveLength(30);
    expect(result.current.year.data?.untilOn).toBe('2026-12-31');
    expect(result.current.year.data?.days).toHaveLength(365);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it('keeps the previous period on screen while the next one loads', async () => {
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(({ from, to }) => useSpendHeatmapRange(from, to), {
      wrapper,
      initialProps: { from: '2026-09-01', to: '2026-09-30' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ from: '2026-08-01', to: '2026-08-31' });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.fromOn).toBe('2026-09-01');
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.fromOn).toBe('2026-08-01');
  });
});
