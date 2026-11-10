import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';

/**
 * What the dialog needs of the thing being paid: an agenda item has all of it, and so does the
 * item a friend debt is turned into on the Amigos tab.
 */
export type PaymentRegisterItem = Pick<
  Agenda.Item,
  'key' | 'source' | 'title' | 'flow' | 'amountCents' | 'paidCents' | 'remainingCents'
>;

export type PaymentRegisterViewProps = {
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
  /** Today as `YYYY-MM-DD` in the business time zone, for the "Hoje" and "Ontem" shortcuts. */
  today: string;
  errors: { amountCents?: string; paidOn?: string };
  /** What is left to pay or receive. */
  remainingCents: number;
  /** Half of what is left, for the "Metade" shortcut. */
  halfCents: number;
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
