import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCreateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-create-recurrence.hook.ts';
import { useUpdateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-update-recurrence.hook.ts';
import { useProfile } from '#/domain/profile/profile/hooks/use-profile.hook.ts';
import { useUpdateProfile } from '#/domain/profile/profile/hooks/use-update-profile.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('profile domain', () => {
  it('reads the profile with the income sources', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('Davi Moreira');
    expect(result.current.data?.income.sources).toHaveLength(5);
  });

  it('saves the profile and the read follows', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => ({ read: useProfile(), save: useUpdateProfile() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));

    await act(() => result.current.save.mutateAsync({ name: 'Clara Nunes' }));

    await waitFor(() => expect(result.current.read.data?.initials).toBe('CN'));
    expect(result.current.read.data?.name).toBe('Clara Nunes');
  });

  it('creating an income recurrence refreshes the profile (a source is a recurrence)', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => ({ read: useProfile(), create: useCreateRecurrence() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));
    const before = result.current.read.data?.income.monthlyExpectedCents ?? 0;

    await act(() =>
      result.current.create.mutateAsync({
        kind: 'income',
        name: 'Consultoria Beta',
        expectedAmountCents: 150_000,
        employmentRegime: 'pj',
        dateRule: { type: 'fixed_day', day: 12 },
      }),
    );

    await waitFor(() =>
      expect(result.current.read.data?.income.monthlyExpectedCents).toBe(before + 150_000),
    );
    expect(
      result.current.read.data?.income.sources.find((item) => item.name === 'Consultoria Beta')
        ?.employmentRegime,
    ).toBe('pj');
  });

  it('editing an income source refreshes the profile', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => ({ read: useProfile(), update: useUpdateRecurrence() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));
    const mesada = result.current.read.data?.income.sources.find((item) => item.name === 'Mesada');

    await act(() =>
      result.current.update.mutateAsync({
        id: mesada?.recurrenceId ?? '',
        body: { expectedAmountCents: 90_000, employmentRegime: 'other' },
      }),
    );

    await waitFor(() =>
      expect(
        result.current.read.data?.income.sources.find((item) => item.name === 'Mesada')
          ?.expectedAmountCents,
      ).toBe(90_000),
    );
  });
});
