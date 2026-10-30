import type { CategoryOption } from '@fincheck/ui';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';

/** "Eu devo" (`payable`) or "Me devem" (`receivable`). */
export type DebtMode = 'owe' | 'owed';

export type DebtCreateErrors = {
  counterparty?: string;
  description?: string;
  amountCents?: string;
  dueOn?: string;
};

type CandidatePicker = {
  options: PaymentCandidateOption[];
  selected: string | null;
  onSelect: (transactionId: string | null) => void;
  isLoading: boolean;
};

/** What the note under the amount says; the numbers go through `Money` in the view. */
export type DebtNote = {
  mode: DebtMode;
  /** The friend, for "o que Júlia te deve". */
  name: string;
  /** The Pix chosen, if any. */
  pixCents: number | null;
  /** What is left of the debt after the Pix (the debt total without it). */
  remainingCents: number;
};

export type DebtCreateViewProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: DebtMode;
  onModeChange: (mode: DebtMode) => void;
  counterparty: string;
  onCounterpartyChange: (name: string) => void;
  /** Names already used, offered as quick choices (most recent first). */
  counterpartySuggestions: string[];
  description: string;
  onDescriptionChange: (text: string) => void;
  amountCents: number;
  onAmountChange: (cents: number) => void;
  dueOn: string;
  onDueOnChange: (date: string) => void;
  /** "Eu devo" only: the category of what was paid (Q18). Null hides the field. */
  categories: {
    options: CategoryOption[];
    value: string;
    onChange: (id: string) => void;
  } | null;
  /** "Me devem" only: the outgoing transaction Lucas paid (Q19). Null hides the field. */
  origin: CandidatePicker | null;
  /** The Pix already made, linked to the debt. */
  pix: CandidatePicker;
  note: DebtNote;
  errors: DebtCreateErrors;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
};
