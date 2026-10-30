import { createInvoicePaymentRequestSchema } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { useInvoiceDetailModel } from '#/features/invoices/invoice-detail/invoice-detail.model.ts';
import { InvoiceDetailView } from '#/features/invoices/invoice-detail/invoice-detail.view.tsx';
import { buildInvoiceDetail } from '#/features/invoices/invoice-detail/utils/build-invoice-detail.util.ts';
import { getTodayBusinessDate } from '#/features/invoices/invoice-summary/utils/get-today-business-date.util.ts';
import { splitInvoiceTarget } from '#/features/invoices/invoice-summary/utils/split-invoice-target.util.ts';

/** "Ver fatura": items, breakdown, payments and the payment the app found. Opens by `?invoice=<cardId>:<YYYY-MM>`. */
export function InvoiceDetailViewModel() {
  const { search, update } = useAccountsSearch();
  const target = splitInvoiceTarget(search.invoice);
  const model = useInvoiceDetailModel(target);
  const toast = useToast();

  const [registering, setRegistering] = useState(false);
  const [typedCents, setTypedCents] = useState<number | null>(null);
  const [paidOn, setPaidOn] = useState(() => getTodayBusinessDate(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const data = model.invoice ? buildInvoiceDetail(model.invoice, model.cardName) : null;

  function close() {
    setRegistering(false);
    setTypedCents(null);
    setPaidOn(getTodayBusinessDate(new Date()));
    setError(null);
    setActionError(null);
    update({ invoice: undefined });
  }

  function savePayment() {
    if (!target || !data) return;
    const parsed = createInvoicePaymentRequestSchema.safeParse({
      amountCents: typedCents ?? data.remainingCents,
      paidOn,
    });
    if (!parsed.success) {
      setError('Informe um valor maior que zero e a data do pagamento');
      setFailedAttempts((count) => count + 1);
      return;
    }
    setError(null);
    setActionError(null);
    model.createPayment.mutate(
      { ...target, body: parsed.data },
      {
        onSuccess: () => {
          setRegistering(false);
          setTypedCents(null);
        },
        onError: () => setActionError('Não deu para registrar o pagamento. Tente de novo.'),
      },
    );
  }

  function linkSuggestion() {
    if (!target || !data?.suggestion) return;
    const { suggestion } = data;
    setActionError(null);
    model.createPayment.mutate(
      {
        ...target,
        body: {
          amountCents: suggestion.amountCents,
          paidOn: suggestion.occurredOn,
          transactionId: suggestion.transactionId,
        },
      },
      {
        onSuccess: (invoice) => {
          const payment = invoice.payments.find(
            (item) => item.transactionId === suggestion.transactionId,
          );
          toast.showUndoToast({
            message: 'Pagamento vinculado à fatura. Ele não vira gasto de novo.',
            onUndo: () => {
              if (payment) model.deletePayment.mutate({ ...target, paymentId: payment.id });
            },
          });
        },
        onError: () => setActionError('Não deu para vincular o pagamento. Tente de novo.'),
      },
    );
  }

  function dismissSuggestion() {
    if (!target || !data?.suggestion) return;
    const { transactionId } = data.suggestion;
    setActionError(null);
    model.dismissSuggestion.mutate(
      { ...target, body: { transactionId } },
      {
        onSuccess: () =>
          toast.showUndoToast({
            message: 'Combinado: esse não é o pagamento desta fatura.',
            onUndo: () => model.restoreSuggestion.mutate({ ...target, transactionId }),
          }),
        onError: () => setActionError('Não deu para dispensar a sugestão. Tente de novo.'),
      },
    );
  }

  return (
    <InvoiceDetailView
      isOpen={target !== null}
      onClose={close}
      state={model.isLoading ? 'loading' : model.isError || !data ? 'error' : 'ready'}
      onRetry={model.retry}
      data={data}
      actionError={actionError}
      isBusy={
        model.createPayment.isPending ||
        model.dismissSuggestion.isPending ||
        model.deletePayment.isPending
      }
      registering={registering}
      onStartRegister={() => setRegistering(true)}
      onCancelRegister={() => {
        setRegistering(false);
        setError(null);
      }}
      paymentCents={typedCents ?? data?.remainingCents ?? 0}
      onPaymentCentsChange={setTypedCents}
      paidOn={paidOn}
      onPaidOnChange={setPaidOn}
      today={getTodayBusinessDate(new Date())}
      paymentError={error ?? undefined}
      failedAttempts={failedAttempts}
      onSavePayment={savePayment}
      onLinkSuggestion={linkSuggestion}
      onDismissSuggestion={dismissSuggestion}
    />
  );
}
