import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCreateConnectToken } from '#/domain/sync/connect-token/hooks/use-create-connect-token.hook.ts';
import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';
import { useConnectionRuns } from '#/domain/sync/run/hooks/use-connection-runs.hook.ts';
import { useStartConnectionRun } from '#/domain/sync/run/hooks/use-start-connection-run.hook.ts';
import { useSyncSettings } from '#/domain/sync/settings/hooks/use-sync-settings.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('sync domain', () => {
  it('reads the settings, the connections and the runs of one', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ settings: useSyncSettings(), connections: useConnections() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.settings.isSuccess).toBe(true);
      expect(result.current.connections.isSuccess).toBe(true);
    });
    const [first] = result.current.connections.data?.items ?? [];

    const runs = renderHook(() => useConnectionRuns(first?.id ?? ''), { wrapper });
    await waitFor(() => expect(runs.result.current.data?.items.length).toBeGreaterThan(0));
  });

  it('asks for a widget token (no cache change)', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCreateConnectToken(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(result.current.data?.connectToken).toBeTruthy();
  });

  it('retries now after an error: the connection list shows the run', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ connections: useConnections(), start: useStartConnectionRun() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.connections.isSuccess).toBe(true));
    const first = result.current.connections.data?.items[0];

    await act(async () => {
      await result.current.start.mutateAsync(first?.id ?? '');
    });
    await waitFor(() =>
      expect(
        result.current.connections.data?.items.find((item) => item.id === first?.id)?.lastRun
          ?.status,
      ).toBe('running'),
    );
  });
});
