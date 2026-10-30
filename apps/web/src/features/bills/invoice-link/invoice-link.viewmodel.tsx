import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { useState } from 'react';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useFoundPayment } from '#/features/bills/hooks/use-found-payment.hook.ts';
import { InvoiceLinkView } from '#/features/bills/invoice-link/invoice-link.view.tsx';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

type InvoiceLinkFormProps = {
  item: Agenda.Item & { paymentFound: NonNullable<Agenda.Item['paymentFound']> };
  onClose: () => void;
};

function InvoiceLinkForm({ item, onClose }: InvoiceLinkFormProps) {
  const accounts = useAccounts();
  const { link, dismiss, isPending } = useFoundPayment();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const account = accounts.data?.items.find((entry) => entry.id === item.paymentFound.accountId);

  async function answer(action: (found: Agenda.Item) => Promise<void>) {
    if (isPending) return;
    setSubmitError(null);
    try {
      await action(item);
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <InvoiceLinkView
      isOpen
      onClose={onClose}
      invoiceName={item.title}
      accountName={account ? (account.institutionName ?? account.name) : ''}
      amountCents={Math.abs(item.paymentFound.amountCents)}
      dateText={formatDayMonth(item.paymentFound.occurredOn)}
      submitError={submitError}
      isSaving={isPending}
      onLink={() => void answer(link)}
      onDismiss={() => void answer(dismiss)}
    />
  );
}

type InvoiceLinkDialogProps = {
  /** The invoice with a payment found; null keeps the dialog closed. */
  item: Agenda.Item | null;
  onClose: () => void;
};

/** "Vincular o pagamento?": the Pix the API found for an invoice, to link or to refuse. */
export function InvoiceLinkDialog({ item, onClose }: InvoiceLinkDialogProps) {
  if (!item || !item.paymentFound) return null;
  return (
    <InvoiceLinkForm
      key={item.key}
      item={{ ...item, paymentFound: item.paymentFound }}
      onClose={onClose}
    />
  );
}
