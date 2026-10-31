import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAgenda } from '#/domain/dashboard/agenda/hooks/use-agenda.hook.ts';
import { useOccurrences } from '#/domain/recurrences/occurrence/hooks/use-occurrences.hook.ts';
import { useSkipOccurrence } from '#/domain/recurrences/occurrence/hooks/use-skip-occurrence.hook.ts';
import { useUnskipOccurrence } from '#/domain/recurrences/occurrence/hooks/use-unskip-occurrence.hook.ts';
import { usePreviewRecurrence } from '#/domain/recurrences/recurrence/hooks/use-preview-recurrence.hook.ts';
import { useRecurrenceSummary } from '#/domain/recurrences/recurrence/hooks/use-recurrence-summary.hook.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('recurrences domain', () => {
  it('reads the month occurrences and the summary', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ list: useOccurrences(CURRENT_MONTH), summary: useRecurrenceSummary(CURRENT_MONTH) }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
      expect(result.current.summary.isSuccess).toBe(true);
    });

    expect(result.current.list.data?.items.length).toBeGreaterThan(0);
  });

  it('previews the next occurrences of a date rule (a POST read)', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () =>
        usePreviewRecurrence({
          dateRule: { type: 'fixed_day', day: 10 },
          startsMonth: CURRENT_MONTH,
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.occurrences.length).toBeGreaterThan(0);
  });

  it('skips an occurrence and undoes it; the month list and the agenda follow', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useOccurrences(CURRENT_MONTH),
        agenda: useAgenda(CURRENT_MONTH),
        skip: useSkipOccurrence(),
        unskip: useUnskipOccurrence(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
      expect(result.current.agenda.isSuccess).toBe(true);
    });
    const diarista = result.current.list.data?.items.find(
      (item) => item.recurrenceName === 'Diarista',
    );
    const status = () =>
      result.current.list.data?.items.find((item) => item.id === diarista?.id)?.status;
    const inAgenda = () =>
      [...(result.current.agenda.data?.thisMonth ?? [])].some(
        (item) => item.source.occurrenceId === diarista?.id,
      );
    expect(inAgenda()).toBe(true);

    await act(async () => {
      await result.current.skip.mutateAsync(diarista?.id ?? '');
    });
    await waitFor(() => expect(status()).toBe('skipped'));
    await waitFor(() => expect(inAgenda()).toBe(false));

    await act(async () => {
      await result.current.unskip.mutateAsync(diarista?.id ?? '');
    });
    await waitFor(() => expect(status()).not.toBe('skipped'));
  });
});
