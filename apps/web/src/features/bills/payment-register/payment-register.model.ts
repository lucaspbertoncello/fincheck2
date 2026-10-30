import type { RefObject } from 'react';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';

export type PaymentRegisterViewProps = {
  formRef: RefObject<HTMLFormElement | null>;
  isOpen: boolean;
  onClose: () => void;
  /** "Registrar pagamento" or "Registrar recebimento". */
  title: string;
  /** The item: "Fatura Bradesco". */
  subtitle: string;
  flow: 'expense' | 'income';
  amountCents: number;
  onAmountChange: (cents: number) => void;
  paidOn: string;
  onPaidOnChange: (date: string) => void;
  errors: { amountCents?: string; paidOn?: string };
  /** What is left to pay or receive, shown under the amount. */
  remainingCents: number;
  /** Bills only: the recent transactions that could be the Pix. Null for an invoice. */
  candidates: {
    options: PaymentCandidateOption[];
    selected: string | null;
    onSelect: (transactionId: string | null) => void;
    isLoading: boolean;
  } | null;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
};
