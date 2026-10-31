import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
