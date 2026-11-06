import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBillCounterparties } from '#/domain/bills/bill/hooks/use-bill-counterparties.hook.ts';
import { useBill } from '#/domain/bills/bill/hooks/use-bill.hook.ts';
import { useCreateBill } from '#/domain/bills/bill/hooks/use-create-bill.hook.ts';
import { useCreateBillPayment } from '#/domain/bills/bill-payment/hooks/use-create-bill-payment.hook.ts';
import { useDeleteBillPayment } from '#/domain/bills/bill-payment/hooks/use-delete-bill-payment.hook.ts';
import { useFreeBalance } from '#/domain/dashboard/free-balance/hooks/use-free-balance.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('bills domain', () => {
  it('reads the counterparty names', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBillCounterparties(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items.map((item) => item.name)).toContain('Rafa');
  });

  it('creates a bill, pays it and undoes the payment; the bill and the Livre follow', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        free: useFreeBalance(),
        create: useCreateBill(),
        pay: useCreateBillPayment(),
        undo: useDeleteBillPayment(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.free.isSuccess).toBe(true);
    });

    let id = '';
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        direction: 'payable',
        kind: 'general',
        description: 'Conta nova',
        amountCents: 12_000,
        dueOn: '2099-01-01',
      });
      id = created.id;
    });
    const bill = renderHook(() => useBill(id), { wrapper });
    const read = () => bill.result.current.data;
    await waitFor(() => expect(read()?.status).toBe('open'));

    let paymentId = '';
    await act(async () => {
      const paid = await result.current.pay.mutateAsync({
        id,
        body: { amountCents: 12_000, paidOn: '2026-10-30' },
      });
      paymentId = paid.payments[0]?.id ?? '';
    });
    await waitFor(() => expect(read()?.status).toBe('settled'));

    await act(async () => {
      await result.current.undo.mutateAsync({ id, paymentId });
    });
    await waitFor(() => expect(read()?.status).toBe('open'));
  });
});
