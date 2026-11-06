import { useToast } from '@fincheck/ui';

import { useLinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-link-occurrence-payment.hook.ts';
import { useUnlinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-unlink-occurrence-payment.hook.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';

/** Links a queue transaction to a recurrence occurrence, with a toast that unlinks it. */
export function useLinkReviewPayment({ onError }: { onError: (message: string) => void }) {
  const { showUndoToast } = useToast();
  const linkPayment = useLinkOccurrencePayment();
  const unlinkPayment = useUnlinkOccurrencePayment();

  return async function linkPaymentFor(transactionId: string, occurrenceId: string) {
    try {
      const occurrence = await linkPayment.mutateAsync({
        id: occurrenceId,
        body: { transactionId },
      });
      const payment = occurrence.payments.find((item) => item.transactionId === transactionId);
      showUndoToast({
        message: `Pix ligado a ${occurrence.recurrenceName}`,
        onUndo: () => {
          if (!payment) return;
          unlinkPayment
            .mutateAsync({ id: occurrenceId, paymentId: payment.id })
            .catch((error: unknown) =>
              onError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.')),
            );
        },
        withIcon: true,
      });
    } catch (error) {
      onError(getApiErrorMessage(error, 'Não deu para ligar o Pix. Tente de novo.'));
    }
  };
}
