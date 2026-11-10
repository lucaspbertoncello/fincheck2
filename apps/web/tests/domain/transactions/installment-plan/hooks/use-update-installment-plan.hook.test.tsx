import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInstallmentPlans } from '#/domain/transactions/installment-plan/hooks/use-installment-plans.hook.ts';
import { useUpdateInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-update-installment-plan.hook.ts';
import { isApiError } from '#/shared/api/api.error.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function render() {
  const { wrapper } = createQueryWrapper();
  return renderHook(() => ({ plans: useInstallmentPlans(), update: useUpdateInstallmentPlan() }), {
    wrapper,
  });
}

describe('installment plan domain', () => {
  it('edits a manual plan and refreshes the list of plans', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.plans.isSuccess).toBe(true));
    const manual = result.current.plans.data?.items.find((plan) => plan.origin === 'manual');
    expect(manual).toBeDefined();

    await act(async () => {
      await result.current.update.mutateAsync({
        id: manual?.id ?? '',
        body: { description: 'Tênis novo', totalCents: 80_000 },
      });
    });

    await waitFor(() => {
      const refreshed = result.current.plans.data?.items.find((plan) => plan.id === manual?.id);
      expect(refreshed?.description).toBe('Tênis novo');
      expect(refreshed?.totalCents).toBe(80_000);
    });
  });

  it('fails with the code of the API for a plan of the bank', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.plans.isSuccess).toBe(true));
    const bank = result.current.plans.data?.items.find((plan) => plan.origin === 'bank');

    const error = await act(async () =>
      result.current.update
        .mutateAsync({ id: bank?.id ?? '', body: { description: 'Outro nome' } })
        .then(
          () => null,
          (caught: unknown) => caught,
        ),
    );

    expect(isApiError(error) && error.code).toBe('INSTALLMENT_PLAN_NOT_MANUAL');
  });
});
