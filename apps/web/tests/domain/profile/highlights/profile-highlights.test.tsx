import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { useProfileHighlights } from '#/domain/profile/highlights/hooks/use-profile-highlights.hook.ts';
import { server } from '#mocks/setup/server.util.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('profile highlights domain', () => {
  it('reads the six curiosities', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProfileHighlights(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Object.keys(result.current.data ?? {}).sort()).toEqual([
      'costliestMonth',
      'costliestWeekday',
      'largestPixReceived',
      'largestPixSent',
      'longestNoSpendStreak',
      'topCategory',
    ]);
  });

  it('refuses an answer outside the contract', async () => {
    server.use(http.get('/api/profile/highlights', () => HttpResponse.json({ largestPixSent: 1 })));
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProfileHighlights(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
