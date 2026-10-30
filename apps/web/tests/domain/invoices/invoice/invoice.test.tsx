import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCardInvoice } from '#/domain/invoices/invoice/hooks/use-card-invoice.hook.ts';
import { useOpenInvoices } from '#/domain/invoices/invoice/hooks/use-open-invoices.hook.ts';
import { useDismissInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-dismiss-invoice-payment-suggestion.hook.ts';
import { useRestoreInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-restore-invoice-payment-suggestion.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('invoices domain', () => {
  it('reads the open invoices and one invoice in detail', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useOpenInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [first] = result.current.data?.items ?? [];

    const detail = renderHook(
      () => useCardInvoice(first?.accountId ?? '', first?.invoice.month ?? ''),
      { wrapper },
    );
    await waitFor(() => expect(detail.result.current.data?.month).toBe(first?.invoice.month));
  });

  it('dismisses the payment found, and the undo (DELETE with ?transactionId=) brings it back', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        open: useOpenInvoices(),
        dismiss: useDismissInvoicePaymentSuggestion(),
        restore: useRestoreInvoicePaymentSuggestion(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.open.isSuccess).toBe(true));
    const closed = result.current.open.data?.items.find(
      (item) => item.invoice.status === 'closed' && item.invoice.paymentSuggestion !== null,
    );
    const transactionId = closed?.invoice.paymentSuggestion?.transactionId ?? '';
    const target = { accountId: closed?.accountId ?? '', month: closed?.invoice.month ?? '' };
    const read = () =>
      result.current.open.data?.items.find((item) => item.accountId === target.accountId);

    await act(async () => {
      await result.current.dismiss.mutateAsync({ ...target, body: { transactionId } });
    });
    await waitFor(() => expect(read()?.invoice.paymentSuggestion ?? null).toBeNull());

    await act(async () => {
      await result.current.restore.mutateAsync({ ...target, transactionId });
    });
    await waitFor(() =>
      expect(read()?.invoice.paymentSuggestion?.transactionId).toBe(transactionId),
    );
  });
});
