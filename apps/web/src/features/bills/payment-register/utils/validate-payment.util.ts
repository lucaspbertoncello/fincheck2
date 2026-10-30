import { createBillPaymentRequestSchema } from '@fincheck/shared/bills/bill-payment/bill-payment.schema.ts';
import { createInvoicePaymentRequestSchema } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';

import { collectFieldErrors } from '#/features/bills/utils/collect-field-errors.util.ts';

type PaymentInput = {
  kind: 'bill' | 'invoice';
  amountCents: number;
  /** `YYYY-MM-DD`, or empty while the date is incomplete. */
  paidOn: string;
  /** The Pix chosen to be linked, if any. */
  transactionId: string | null;
  /** What is still to pay or receive. */
  remainingCents: number;
};

type PaymentBody = { transactionId?: string; amountCents?: number; paidOn?: string };

type PaymentValidation =
  { ok: true; body: PaymentBody } | { ok: false; errors: Record<string, string> };

const MESSAGES = {
  amountCents: 'Informe um valor maior que zero',
  paidOn: 'Informe a data completa',
  transactionId: 'Escolha uma transação válida',
};

/**
 * Checks the form of "Registrar pagamento" with the request schema of the owner (bill or invoice)
 * and the one rule the schema cannot see: the amount cannot pass what is left.
 */
export function validatePayment(input: PaymentInput): PaymentValidation {
  const linked = input.transactionId !== null;
  const candidate: PaymentBody =
    linked && input.kind === 'bill'
      ? { transactionId: input.transactionId ?? undefined, amountCents: input.amountCents }
      : {
          amountCents: input.amountCents,
          paidOn: input.paidOn || undefined,
          ...(linked ? { transactionId: input.transactionId ?? undefined } : {}),
        };

  const parsed =
    input.kind === 'bill'
      ? createBillPaymentRequestSchema.safeParse(candidate)
      : createInvoicePaymentRequestSchema.safeParse(candidate);

  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error, MESSAGES) };
  if (input.amountCents > input.remainingCents) {
    return { ok: false, errors: { amountCents: 'O valor passa do que falta' } };
  }

  return { ok: true, body: parsed.data };
}
