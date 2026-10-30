import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { useToast } from '@fincheck/ui';
import { useRef, useState } from 'react';

import { useBillPaymentCandidates } from '#/domain/bills/bill/hooks/use-bill-payment-candidates.hook.ts';
import { useCreateBillPayment } from '#/domain/bills/bill-payment/hooks/use-create-bill-payment.hook.ts';
import { useDeleteBillPayment } from '#/domain/bills/bill-payment/hooks/use-delete-bill-payment.hook.ts';
import { useCreateInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-create-invoice-payment.hook.ts';
import { useDeleteInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-delete-invoice-payment.hook.ts';
import { resolvePaymentTarget } from '#/domain/bills/bill/rules/resolve-payment-target.rule.ts';
import { useFocusFirstInvalid } from '#/features/bills/hooks/use-focus-first-invalid.hook.ts';
import { PaymentRegisterView } from '#/features/bills/payment-register/payment-register.view.tsx';
import { validatePayment } from '#/features/bills/payment-register/utils/validate-payment.util.ts';
import { buildCandidateOptions } from '#/features/bills/utils/build-candidate-options.util.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { getBusinessToday } from '#/features/bills/utils/get-business-today.util.ts';

type PaymentRegisterFormProps = {
  item: Agenda.Item;
  onClose: () => void;
};

// The form of one item. It is mounted per item (`key`), so its state starts fresh each time.
function PaymentRegisterForm({ item, onClose }: PaymentRegisterFormProps) {
  const target = resolvePaymentTarget(item);
  const kind = target?.kind === 'invoice' ? 'invoice' : 'bill';
  const remainingCents = Math.max(0, item.amountCents - item.paidCents);
  const flow = item.flow === 'in' ? 'income' : 'expense';

  const formRef = useRef<HTMLFormElement>(null);
  const [amountCents, setAmountCents] = useState(item.remainingCents || remainingCents);
  const [paidOn, setPaidOn] = useState(getBusinessToday());
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ amountCents?: string; paidOn?: string }>({});
  const [attempt, setAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showUndoToast } = useToast();
  const candidatesQuery = useBillPaymentCandidates(target?.kind === 'bill' ? target.billId : '', {
    enabled: target?.kind === 'bill',
  });
  const options = buildCandidateOptions(candidatesQuery.data?.items ?? []);
  const createBillPayment = useCreateBillPayment();
  const deleteBillPayment = useDeleteBillPayment();
  const createInvoicePayment = useCreateInvoicePayment();
  const deleteInvoicePayment = useDeleteInvoicePayment();
  const isSaving = createBillPayment.isPending || createInvoicePayment.isPending;

  useFocusFirstInvalid(formRef, attempt);

  function selectCandidate(next: string | null) {
    setTransactionId(next);
    const option = options.find((entry) => entry.transactionId === next);
    const candidate = candidatesQuery.data?.items.find((entry) => entry.transactionId === next);
    if (option && candidate) {
      setAmountCents(Math.min(option.amountCents, remainingCents));
      setPaidOn(candidate.occurredOn);
    }
  }

  async function submit() {
    if (!target || isSaving) return;
    setSubmitError(null);
    const result = validatePayment({ kind, amountCents, paidOn, transactionId, remainingCents });
    if (!result.ok) {
      setErrors(result.errors);
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});

    try {
      if (target.kind === 'bill') {
        const bill = await createBillPayment.mutateAsync({ id: target.billId, body: result.body });
        const payment =
          bill.payments.find((entry) => transactionId && entry.transactionId === transactionId) ??
          bill.payments.findLast(
            (entry) => entry.transactionId === null && entry.amountCents === amountCents,
          );
        showUndoToast({
          message: `${flow === 'income' ? 'Recebimento' : 'Pagamento'} de ${item.title} registrado.`,
          withIcon: true,
          onUndo: () => {
            if (payment) deleteBillPayment.mutate({ id: target.billId, paymentId: payment.id });
          },
        });
      } else if (target.kind === 'invoice') {
        const invoice = await createInvoicePayment.mutateAsync({
          accountId: target.accountId,
          month: target.month,
          body: { amountCents, paidOn },
        });
        const payment = invoice.payments.findLast(
          (entry) => entry.transactionId === null && entry.amountCents === amountCents,
        );
        showUndoToast({
          message: `Pagamento de ${item.title} registrado.`,
          withIcon: true,
          onUndo: () => {
            if (payment) {
              deleteInvoicePayment.mutate({
                accountId: target.accountId,
                month: target.month,
                paymentId: payment.id,
              });
            }
          },
        });
      }
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <PaymentRegisterView
      formRef={formRef}
      isOpen
      onClose={onClose}
      title={flow === 'income' ? 'Registrar recebimento' : 'Registrar pagamento'}
      subtitle={item.title}
      flow={flow}
      amountCents={amountCents}
      onAmountChange={setAmountCents}
      paidOn={paidOn}
      onPaidOnChange={setPaidOn}
      errors={errors}
      remainingCents={remainingCents}
      candidates={
        kind === 'bill'
          ? {
              options,
              selected: transactionId,
              onSelect: selectCandidate,
              isLoading: candidatesQuery.isPending,
            }
          : null
      }
      submitError={submitError}
      isSaving={isSaving}
      onSubmit={() => void submit()}
    />
  );
}

type PaymentRegisterDialogProps = {
  /** The agenda item being paid; null keeps the dialog closed. */
  item: Agenda.Item | null;
  onClose: () => void;
};

/** "Registrar pagamento" / "Registrar recebimento" of a bill or an invoice, partial or total. */
export function PaymentRegisterDialog({ item, onClose }: PaymentRegisterDialogProps) {
  if (!item) return null;
  return <PaymentRegisterForm key={item.key} item={item} onClose={onClose} />;
}
